import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const avatarVariants = cva(
	"inline-flex items-center justify-center font-black uppercase brutal-border-thin bg-brutal-yellow text-brutal-black",
	{
		variants: {
			size: {
				sm: "w-8 h-8 text-xs",
				md: "w-12 h-12 text-base",
				lg: "w-16 h-16 text-xl",
				xl: "w-24 h-24 text-3xl",
			},
			shape: {
				circle: "rounded-full",
				square: "",
			},
		},
		defaultVariants: {
			size: "md",
			shape: "square",
		},
	}
);

type AvatarProps = React.HTMLAttributes<HTMLDivElement> &
	VariantProps<typeof avatarVariants> & {
		name?: string;
		src?: string;
	};

export function Avatar({
	className,
	size,
	shape,
	name,
	src,
	...props
}: AvatarProps) {
	const initial = name?.charAt(0)?.toUpperCase() ?? "?";

	if (src) {
		return (
			<img
				src={src}
				alt={name ?? "avatar"}
				className={cn(avatarVariants({ size, shape }), "object-cover", className)}
				{...props}
			/>
		);
	}

	return (
		<div
			className={cn(avatarVariants({ size, shape }), className)}
			{...props}
		>
			{initial}
		</div>
	);
}
