'use client';

import { MutableRefObject } from 'react';

interface VideoDisplayProps {
	videoRef: MutableRefObject<HTMLVideoElement | null>;
}

function VideoDisplay({ videoRef }: VideoDisplayProps) {
	return (
		<video
			ref={videoRef}
			autoPlay
			playsInline
			className='w-full max-w-xl border-2 border-black rounded-md mb-4'
		></video>
	);
}

export default VideoDisplay;
