export function CameraBar({ children }: { children: React.ReactNode }) {
	return (
		<div className="bg-black/75 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] px-5 rounded-t-4xl -mt-5 z-30 border-t border-gray-800/60 shadow-[0_-20px_50px_rgba(0,0,0,0.7)] shrink-0 absolute bottom-0 inset-x-0">
			{children}
		</div>
	);
}
