import { cn } from "../../lib/utils";

type SectionProps = React.HTMLAttributes<HTMLElement> & {
	title?: string;
	subtitle?: string;
	bg?: "white" | "yellow" | "lavender" | "coral" | "lime" | "black";
};

const bgMap = {
	white: "bg-brutal-white",
	yellow: "bg-brutal-yellow",
	lavender: "bg-brutal-lavender",
	coral: "bg-brutal-coral",
	lime: "bg-brutal-lime",
	black: "bg-brutal-black text-brutal-white",
};

export function Section({
	className,
	title,
	subtitle,
	bg = "white",
	children,
	...props
}: SectionProps) {
	return (
		<section
			className={cn("py-16 sm:py-20", bgMap[bg], className)}
			{...props}
		>
			{(title || subtitle) && (
				<div className="mb-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					{title && (
						<h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
							{title}
						</h2>
					)}
					{subtitle && (
						<p className="mt-2 text-lg opacity-70">{subtitle}</p>
					)}
				</div>
			)}
			{children}
		</section>
	);
}
