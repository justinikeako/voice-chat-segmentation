import { cn } from "../../lib/utils";

type ContainerProps = React.HTMLAttributes<HTMLDivElement> & {
	size?: "sm" | "md" | "lg" | "full";
};

export function Container({
	className,
	size = "lg",
	...props
}: ContainerProps) {
	return (
		<div
			className={cn(
				"w-full mx-auto px-4 sm:px-6 lg:px-8",
				size === "sm" && "max-w-xl",
				size === "md" && "max-w-3xl",
				size === "lg" && "max-w-6xl",
				size === "full" && "max-w-full",
				className
			)}
			{...props}
		/>
	);
}
