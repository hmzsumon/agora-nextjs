'use client';

interface ControlPanelProps {
	username: string;
	setUsername: (username: string) => void;
	handleHost: () => Promise<void>;
	handleAudience: () => void;
	connected: boolean;
	toggleMic: () => Promise<void>;
	micEnabled: boolean;
	micList: string[];
	requestJoinCall: () => void;
}

function ControlPanel({
	username,
	setUsername,
	handleHost,
	handleAudience,
	connected,
	toggleMic,
	micEnabled,
	micList,
	requestJoinCall,
}: ControlPanelProps) {
	return (
		<div className='flex flex-col items-center mt-4'>
			<input
				value={username}
				onChange={(e) => setUsername(e.target.value)}
				placeholder='Your name'
				className='p-2 border rounded-md mb-2'
			/>
			<div className='flex space-x-2'>
				<button
					onClick={handleHost}
					className='p-2 bg-green-500 text-white rounded-md'
				>
					Start as Host
				</button>
				<button
					onClick={handleAudience}
					className='p-2 bg-blue-500 text-white rounded-md'
				>
					Join as Audience
				</button>
				{connected && (
					<>
						<button
							onClick={toggleMic}
							className='p-2 bg-gray-500 text-white rounded-md'
						>
							{micEnabled ? '❌ Disable Mic' : '️ Enable Mic'}
						</button>
						<button
							onClick={requestJoinCall}
							className='p-2 bg-purple-500 text-white rounded-md'
						>
							🎥 Join Call
						</button>
					</>
				)}
			</div>
			<div className='mt-4'>
				{micList.map((item, i) => (
					<p key={i} className='mb-2 p-2 bg-white rounded-md shadow-sm'>
						{item}
					</p>
				))}
			</div>
		</div>
	);
}

export default ControlPanel;
