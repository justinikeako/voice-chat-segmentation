import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const cardVariants = cva("", {
	variants: {
		variant: {
			default:
				"bg-brutal-white brutal-border brutal-shadow",
			highlight:
				"bg-brutal-yellow brutal-border brutal-shadow",
			lavender:
				"bg-brutal-lavender brutal-border brutal-shadow",
			coral:
				"bg-brutal-coral brutal-border brutal-shadow",
			lime:
				"bg-brutal-lime brutal-border brutal-shadow",
			flat: "bg-brutal-white brutal-border",
		},
		padding: {
			none: "",
			sm: "p-3",
			md: "p-5",
			lg: "p-7",
		},
	},
	defaultVariants: {
		variant: "default",
		padding: "md",
	},
});

type CardProps = React.HTMLAttributes<HTMLDivElement> &
	VariantProps<typeof cardVariants>;

export function Card({ className, variant, padding, ...props }: CardProps) {
	return (
		<div className={cn(cardVariants({ variant, padding }), className)} {...props} />
	);
}

export function CardHeader({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn("brutal-border-b p-4 font-black uppercase tracking-wider", className)}
			{...props}
		/>
	);
}

export function CardContent({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return <div className={cn("p-5", className)} {...props} />;
}

export { cardVariants };
