import { useEffect } from "react";
import { cn } from "../../lib/utils";

type ModalProps = {
	open: boolean;
	onClose: () => void;
	title?: string;
	children: React.ReactNode;
	className?: string;
};

export function Modal({ open, onClose, title, children, className }: ModalProps) {
	useEffect(() => {
		if (open) {
			document.body.style.overflow = "hidden";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [open]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
			<div
				className="absolute inset-0 bg-brutal-black/60"
				onClick={onClose}
			/>
			<div
				className={cn(
					"relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-brutal-white brutal-border brutal-shadow-lg",
					className
				)}
			>
				{title && (
					<div className="flex items-center justify-between px-5 py-4 brutal-border-b">
						<h3 className="font-black uppercase tracking-wider text-sm">
							{title}
						</h3>
						<button
							onClick={onClose}
							className="w-8 h-8 flex items-center justify-center font-black text-lg hover:bg-brutal-coral transition-colors cursor-pointer"
						>
							&times;
						</button>
					</div>
				)}
				<div className="p-5">{children}</div>
			</div>
		</div>
	);
}
