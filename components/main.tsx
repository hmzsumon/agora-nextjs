'use client';

import { useRef, useState } from 'react';
import SimplePeer from 'simple-peer';
import io from 'socket.io-client';

// const socket = io('https://simple-peer-server-93fa39be00c7.herokuapp.com');
const socket = io('http://localhost:5000');

export default function Home() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [username, setUsername] = useState('');
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [isHost, setIsHost] = useState(false);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [peer, setPeer] = useState<SimplePeer.Instance | null>(null);
	const [audioPeer, setAudioPeer] = useState<SimplePeer.Instance | null>(null);
	const [connected, setConnected] = useState(false);
	const [micEnabled, setMicEnabled] = useState(false);
	const [micList, setMicList] = useState<string[]>([]);

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
				if (from === audienceId) {
					p.signal(data);
				}
			});
		});

		socket.on('audience-mic-on', ({ username }) => {
			setMicList((prev) => [...prev, `🎙️ ${username} enabled mic`]);
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

	return (
		<main style={{ textAlign: 'center', fontFamily: 'sans-serif' }}>
			<h2>🎥 WebRTC Stream with Mic Toggle (Next.js 14)</h2>
			<video
				ref={videoRef}
				autoPlay
				playsInline
				style={{ width: 600, border: '2px solid black', marginBottom: '1rem' }}
			></video>

			<div>
				<input
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					placeholder='Your name'
				/>
				<button onClick={handleHost}>Start as Host</button>
				<button onClick={handleAudience}>Join as Audience</button>
				{connected && (
					<button onClick={toggleMic}>
						{micEnabled ? '❌ Disable Mic' : '🎙️ Enable Mic'}
					</button>
				)}
			</div>

			<div style={{ marginTop: '1rem' }}>
				{micList.map((item, i) => (
					<p key={i}>{item}</p>
				))}
			</div>
		</main>
	);
}
