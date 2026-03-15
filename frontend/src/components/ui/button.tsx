import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center font-black uppercase tracking-wider transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
	{
		variants: {
			variant: {
				primary:
					"bg-brutal-yellow text-brutal-black brutal-border brutal-shadow hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--color-brutal-black)]",
				secondary:
					"bg-brutal-white text-brutal-black brutal-border brutal-shadow hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--color-brutal-black)]",
				danger:
					"bg-brutal-coral text-brutal-black brutal-border brutal-shadow hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--color-brutal-black)]",
				ghost:
					"bg-transparent text-brutal-black hover:bg-brutal-black/5 border-none",
				link: "bg-transparent text-brutal-black underline underline-offset-4 decoration-2 hover:decoration-brutal-yellow border-none p-0",
			},
			size: {
				sm: "text-xs px-3 py-1.5 gap-1.5",
				md: "text-sm px-5 py-2.5 gap-2",
				lg: "text-base px-7 py-3.5 gap-2.5",
			},
		},
		defaultVariants: {
			variant: "primary",
			size: "md",
		},
	}
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
	VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
	return (
		<button
			className={cn(buttonVariants({ variant, size }), className)}
			{...props}
		/>
	);
}

export { buttonVariants };
