import { cn } from "../../lib/utils";

type Tab = {
	id: string;
	label: string;
	icon?: React.ReactNode;
};

type TabsProps = {
	tabs: Tab[];
	active: string;
	onChange: (id: string) => void;
	className?: string;
};

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
	return (
		<div
			className={cn(
				"flex brutal-border-b overflow-x-auto",
				className
			)}
		>
			{tabs.map((tab) => (
				<button
					key={tab.id}
					onClick={() => onChange(tab.id)}
					className={cn(
						"flex-1 min-w-0 px-4 py-3 text-xs font-black uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer",
						"border-b-4 -mb-[3px]",
						active === tab.id
							? "border-brutal-yellow bg-brutal-yellow/20 text-brutal-black"
							: "border-transparent text-brutal-black/50 hover:text-brutal-black hover:bg-brutal-black/5"
					)}
				>
					{tab.icon && <span className="mr-1.5">{tab.icon}</span>}
					{tab.label}
				</button>
			))}
		</div>
	);
}
