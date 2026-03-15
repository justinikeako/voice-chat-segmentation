import { cn } from "../../lib/utils";
import { Card } from "./card";

type DemoTipProps = {
	dark?: boolean;
	className?: string;
};

export function DemoTip({ dark = false, className }: DemoTipProps) {
	return (
		<Card
			variant={dark ? "flat" : "highlight"}
			padding="sm"
			className={cn(
				dark
					? "bg-brutal-black text-brutal-white border-brutal-yellow/30"
					: "",
				className
			)}
		>
			<p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">
				Tip
			</p>
			<p
				className={cn(
					"text-xs leading-relaxed",
					dark ? "text-brutal-white/80" : "text-brutal-black/80"
				)}
			>
				Say <strong>"how does my hair look today?"</strong> on the scan
				page — Kera will give you a live hair read out loud.
			</p>
		</Card>
	);
}
