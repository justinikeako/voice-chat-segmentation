import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
	"inline-flex items-center font-black uppercase tracking-wider brutal-border-thin text-xs px-2.5 py-1",
	{
		variants: {
			variant: {
				default: "bg-brutal-white text-brutal-black",
				success: "bg-brutal-lime text-brutal-black",
				warning: "bg-brutal-yellow text-brutal-black",
				danger: "bg-brutal-coral text-brutal-black",
				info: "bg-brutal-sky text-brutal-black",
				lavender: "bg-brutal-lavender text-brutal-black",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	}
);

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
	VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
	return (
		<span className={cn(badgeVariants({ variant }), className)} {...props} />
	);
}

export { badgeVariants };
