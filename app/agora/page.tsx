// ✅ Agora Group Call with Name/Role Labels + Large Host Video (Vercel-ready)

'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import AgoraRTC, {
	IAgoraRTCClient,
	ILocalVideoTrack,
	ILocalAudioTrack,
	IAgoraRTCRemoteUser,
} from 'agora-rtc-sdk-ng';

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
const CHANNEL = 'webrtc-room';

export default function AgoraLive() {
	const videoGridRef = useRef<HTMLDivElement>(null);
	const [client, setClient] = useState<IAgoraRTCClient | null>(null);
	const [joined, setJoined] = useState(false);
	const [localTracks, setLocalTracks] = useState<
		[ILocalAudioTrack, ILocalVideoTrack] | []
	>([]);
	const [username, setUsername] = useState('');
	const [isHost, setIsHost] = useState(false);
	const [joinedCall, setJoinedCall] = useState(false);
	const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
	const [audioMuted, setAudioMuted] = useState(false);
	const [videoMuted, setVideoMuted] = useState(false);

	useEffect(() => {
		if (typeof window !== 'undefined') {
			const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
			setClient(agoraClient);

			agoraClient.on('user-published', async (user, mediaType) => {
				await agoraClient.subscribe(user, mediaType);
				if (mediaType === 'video') {
					setRemoteUsers((prev) => [...prev, user]);
					requestAnimationFrame(() => {
						const container = document.getElementById(`remote-${user.uid}`);
						if (container && user.videoTrack) {
							user.videoTrack.play(
								container.querySelector('.video') as HTMLElement
							);
						}
					});
				}
				if (mediaType === 'audio') {
					user.audioTrack?.play();
				}
			});

			agoraClient.on('user-unpublished', (user) => {
				setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
			});
		}
	}, []);

	const joinAsHost = async () => {
		if (!client) return;
		setIsHost(true);
		await client.join(APP_ID, CHANNEL, null, username + ' (Host)');

		const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
		const camTrack = await AgoraRTC.createCameraVideoTrack();
		setLocalTracks([micTrack, camTrack]);

		await client.publish([micTrack, camTrack]);
		renderLocalVideo(camTrack);
		setJoined(true);
		setJoinedCall(true);
	};

	const joinAsAudience = async () => {
		if (!client) return;
		await client.join(APP_ID, CHANNEL, null, username + ' (Audience)');
		setJoined(true);
	};

	const joinCallAsAudience = async () => {
		if (!client || joinedCall) return;

		const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
		const camTrack = await AgoraRTC.createCameraVideoTrack();

		await client.publish([micTrack, camTrack]);
		renderLocalVideo(camTrack);

		setLocalTracks([micTrack, camTrack]);
		setJoinedCall(true);
	};

	const renderLocalVideo = (track: ILocalVideoTrack) => {
		requestAnimationFrame(() => {
			const id = `remote-local`;
			let el = document.getElementById(id);
			if (!el) {
				el = document.createElement('div');
				el.id = id;
				el.className = isHost
					? 'w-full h-64 col-span-2 bg-black rounded shadow relative'
					: 'w-full h-40 bg-black rounded shadow relative';
				el.innerHTML = `
          <div class='absolute top-1 left-1 bg-white text-xs px-2 py-1 rounded z-10'>${username} (${
					isHost ? 'Host' : 'Audience'
				})</div>
          <div class='video w-full h-full'></div>
        `;
				videoGridRef.current?.appendChild(el);
			}
			const container = el.querySelector('.video') as HTMLElement;
			track.play(container);
		});
	};

	const leaveCall = async () => {
		if (client && joined) {
			localTracks.forEach((track) => track.stop());
			localTracks.forEach((track) => track.close());
			await client.leave();
			setJoined(false);
			setJoinedCall(false);
			setRemoteUsers([]);
		}
	};

	const toggleMic = async () => {
		if (localTracks[0]) {
			if (audioMuted) {
				await localTracks[0].setEnabled(true);
				setAudioMuted(false);
			} else {
				await localTracks[0].setEnabled(false);
				setAudioMuted(true);
			}
		}
	};

	const toggleCamera = async () => {
		if (localTracks[1]) {
			if (videoMuted) {
				await localTracks[1].setEnabled(true);
				setVideoMuted(false);
			} else {
				await localTracks[1].setEnabled(false);
				setVideoMuted(true);
			}
		}
	};

	return (
		<main className='flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4'>
			<h1 className='text-3xl font-bold mb-4'>Agora Group Video Call</h1>
			<input
				value={username}
				onChange={(e) => setUsername(e.target.value)}
				placeholder='Enter your name'
				className='p-2 border rounded mb-4'
			/>
			<div className='flex gap-2 mb-4'>
				<button
					onClick={joinAsHost}
					className='px-4 py-2 bg-green-500 text-white rounded'
				>
					Start as Host
				</button>
				<button
					onClick={joinAsAudience}
					className='px-4 py-2 bg-blue-500 text-white rounded'
				>
					Join as Audience
				</button>
				<button
					onClick={leaveCall}
					className='px-4 py-2 bg-red-500 text-white rounded'
				>
					Leave
				</button>
			</div>

			{joined && !isHost && !joinedCall && (
				<button
					onClick={joinCallAsAudience}
					className='px-4 py-2 bg-purple-600 text-white rounded mb-4'
				>
					🎥 Join Call
				</button>
			)}

			{joinedCall && (
				<div className='flex gap-4 mb-4'>
					<button
						onClick={toggleMic}
						className='px-4 py-2 bg-yellow-500 text-white rounded'
					>
						{audioMuted ? 'Unmute Mic' : 'Mute Mic'}
					</button>
					<button
						onClick={toggleCamera}
						className='px-4 py-2 bg-yellow-600 text-white rounded'
					>
						{videoMuted ? 'Turn On Camera' : 'Turn Off Camera'}
					</button>
				</div>
			)}

			<div
				ref={videoGridRef}
				className='grid grid-cols-2 gap-4 w-full max-w-xl'
			>
				{remoteUsers.map((user) => (
					<div
						key={user.uid}
						id={`remote-${user.uid}`}
						className='w-full h-40 bg-black rounded shadow relative'
					>
						<div className='absolute top-1 left-1 bg-white text-xs px-2 py-1 rounded z-10'>
							{user.uid} (Audience)
						</div>
						<div className='video w-full h-full'></div>
					</div>
				))}
			</div>
		</main>
	);
}
