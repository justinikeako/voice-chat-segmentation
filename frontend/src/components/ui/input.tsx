import { cn } from "../../lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
	label?: string;
	error?: string;
};

export function Input({ className, label, error, id, ...props }: InputProps) {
	return (
		<div className="flex flex-col gap-1.5">
			{label && (
				<label
					htmlFor={id}
					className="text-xs font-black uppercase tracking-wider"
				>
					{label}
				</label>
			)}
			<input
				id={id}
				className={cn(
					"w-full px-4 py-3 bg-brutal-white brutal-border text-base font-medium",
					"placeholder:text-brutal-black/40 placeholder:uppercase placeholder:text-xs placeholder:tracking-wider placeholder:font-bold",
					"focus:outline-none focus:ring-3 focus:ring-brutal-yellow focus:ring-offset-0",
					"transition-shadow",
					error && "ring-2 ring-brutal-coral",
					className
				)}
				{...props}
			/>
			{error && (
				<span className="text-xs font-bold text-brutal-coral uppercase">
					{error}
				</span>
			)}
		</div>
	);
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
	label?: string;
	error?: string;
};

export function Textarea({
	className,
	label,
	error,
	id,
	...props
}: TextareaProps) {
	return (
		<div className="flex flex-col gap-1.5">
			{label && (
				<label
					htmlFor={id}
					className="text-xs font-black uppercase tracking-wider"
				>
					{label}
				</label>
			)}
			<textarea
				id={id}
				className={cn(
					"w-full px-4 py-3 bg-brutal-white brutal-border text-base font-medium resize-none",
					"placeholder:text-brutal-black/40 placeholder:uppercase placeholder:text-xs placeholder:tracking-wider placeholder:font-bold",
					"focus:outline-none focus:ring-3 focus:ring-brutal-yellow focus:ring-offset-0",
					error && "ring-2 ring-brutal-coral",
					className
				)}
				{...props}
			/>
			{error && (
				<span className="text-xs font-bold text-brutal-coral uppercase">
					{error}
				</span>
			)}
		</div>
	);
}
