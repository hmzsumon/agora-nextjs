/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import ControlPanel from '@/components/ControlPanel';
import VideoDisplay from '@/components/VideoDisplay';
import { useRef, useState, MutableRefObject, useEffect } from 'react';
import SimplePeer, { Instance } from 'simple-peer';
import io, { Socket } from 'socket.io-client';
import baseUrl from '@/config/baseUrl';

const socket: Socket = io(baseUrl);

export default function Home() {
	const videoRef: MutableRefObject<HTMLVideoElement | null> = useRef(null);
	const [username, setUsername] = useState<string>('');
	const [isHost, setIsHost] = useState<boolean>(false);
	const [peer, setPeer] = useState<Instance | null>(null);
	const [audioPeer, setAudioPeer] = useState<Instance | null>(null);
	const [connected, setConnected] = useState<boolean>(false);
	const [micEnabled, setMicEnabled] = useState<boolean>(false);
	const [micList, setMicList] = useState<string[]>([]);
	const [messages, setMessages] = useState<string[]>([]);
	const [messageInput, setMessageInput] = useState<string>('');
	const [audienceList, setAudienceList] = useState<
		Array<{ id: string; username: string }>
	>([]);

	const requestJoinCall = () => {
		socket.emit('join-call-request', { username });
	};

	useEffect(() => {
		socket.on('receive-message', ({ username, message }) => {
			setMessages((prev) => [...prev, `${username}: ${message}`]);
		});

		socket.on('audience-list', (list) => {
			setAudienceList(list);
		});

		socket.on('start-group-call', ({ from }) => {
			const p = new SimplePeer({ initiator: false, trickle: false });

			p.on('signal', (data) => {
				socket.emit('signal', { to: from, from: socket.id, data });
			});

			p.on('stream', (stream) => {
				if (videoRef.current) {
					videoRef.current.srcObject = stream;
					videoRef.current.play();
				}
			});

			socket.on('signal', ({ from: senderId, data }) => {
				if (senderId === from && !p.destroyed) {
					try {
						p.signal(data);
					} catch (err) {
						console.error('Signal error:', err);
					}
				}
			});
		});

		socket.on('join-call-request', ({ socketId, username }) => {
			console.log(`📞 ${username} wants to join group call`);
			const stream = videoRef.current?.srcObject as MediaStream;
			if (!stream) return;

			const p = new SimplePeer({
				initiator: true,
				trickle: false,
				stream,
			});

			p.on('signal', (data) => {
				socket.emit('signal', {
					to: socketId,
					from: socket.id,
					data,
				});
			});

			socket.on('signal', ({ from, data }) => {
				if (from === socketId && !p.destroyed) {
					try {
						p.signal(data);
					} catch (err) {
						console.error('Signal error:', err);
					}
				}
			});

			socket.emit('start-group-call', { from: socket.id });
		});
	}, []);

	const handleHost = async () => {
		setIsHost(true);
		const stream = await navigator.mediaDevices.getUserMedia({
			video: true,
			audio: true,
		});
		if (videoRef.current) {
			videoRef.current.srcObject = stream;
			videoRef.current.muted = true;
			videoRef.current.play();
		}
		socket.emit('host-ready');

		socket.on('start-connection', ({ audienceId }) => {
			const p = new SimplePeer({ initiator: true, trickle: false, stream });

			p.on('signal', (data) => {
				socket.emit('signal', { to: audienceId, from: socket.id, data });
			});

			socket.on('signal', ({ from, data }) => {
				if (from === audienceId && !p.destroyed) {
					try {
						p.signal(data);
					} catch (err) {
						console.error('Signal error:', err);
					}
				}
			});
		});

		socket.on('audience-mic-on', ({ username }) => {
			setMicList((prev) => [...prev, `️ ${username} enabled mic`]);
		});
	};

	const handleAudience = () => {
		socket.emit('audience-join', username);
		socket.on('host-found', ({ socketId }) => {
			const p = new SimplePeer({ initiator: false, trickle: false });

			p.on('signal', (data) => {
				socket.emit('signal', { to: socketId, from: socket.id, data });
			});

			p.on('stream', (stream) => {
				if (videoRef.current) {
					videoRef.current.srcObject = stream;
					videoRef.current.play();
				}
			});

			p.on('connect', () => {
				setConnected(true);
			});

			socket.on('signal', ({ data }) => {
				try {
					if (!p.destroyed && !connected) p.signal(data);
				} catch (e) {
					console.error(e);
				}
			});

			setPeer(p);
		});
	};

	const toggleMic = async () => {
		if (!micEnabled) {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: true,
				});

				const audioP = new SimplePeer({
					initiator: true,
					trickle: false,
					stream,
				});
				audioP.on('signal', (data) => {
					socket.emit('signal', { to: 'host', from: socket.id, data });
				});
				setAudioPeer(audioP);
				setMicEnabled(true);
				socket.emit('mic-enabled', username);
			} catch (e) {
				console.error('Mic error', e);
			}
		} else {
			audioPeer?.destroy();
			setMicEnabled(false);
		}
	};

	const sendMessage = () => {
		if (messageInput) {
			socket.emit('send-message', { username, message: messageInput });
			setMessageInput('');
		}
	};

	return (
		<main className='flex flex-col items-center justify-center min-h-screen py-2 bg-gray-100 px-4'>
			<h2 className='text-3xl font-bold mb-4'>🎥 WebRTC Stream </h2>
			<VideoDisplay videoRef={videoRef} />
			<ControlPanel
				username={username}
				setUsername={setUsername}
				handleHost={handleHost}
				handleAudience={handleAudience}
				connected={connected}
				toggleMic={toggleMic}
				micEnabled={micEnabled}
				micList={micList}
				requestJoinCall={requestJoinCall}
			/>
			<div className='flex w-full max-w-md mt-4'>
				<input
					value={messageInput}
					onChange={(e) => setMessageInput(e.target.value)}
					placeholder='Type a message'
					className='flex-grow p-2 border rounded-l-md'
				/>
				<button
					onClick={sendMessage}
					className='p-2 bg-blue-500 text-white rounded-r-md'
				>
					Send
				</button>
			</div>
			<div className='w-full max-w-md mt-4'>
				{messages.map((message, index) => (
					<p key={index} className='mb-2 p-2 bg-white rounded-md shadow-sm'>
						{message}
					</p>
				))}
			</div>

			{isHost && (
				<div className='w-full max-w-md mt-4'>
					<h3 className='text-lg font-bold mb-2'>Audience List</h3>
					{audienceList.map((audience) => (
						<p
							key={audience.id}
							className='mb-2 p-2 bg-white rounded-md shadow-sm'
						>
							{audience.username} ({audience.id})
						</p>
					))}
				</div>
			)}
		</main>
	);
}
