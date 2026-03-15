import { useState } from "react";
import { cn } from "../../lib/utils";

type AccordionItem = {
	id: string;
	title: string;
	content: React.ReactNode;
};

type AccordionProps = {
	items: AccordionItem[];
	className?: string;
	allowMultiple?: boolean;
};

export function Accordion({
	items,
	className,
	allowMultiple = false,
}: AccordionProps) {
	const [openIds, setOpenIds] = useState<Set<string>>(new Set());

	function toggle(id: string) {
		setOpenIds((prev) => {
			const next = new Set(allowMultiple ? prev : []);
			if (prev.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}

	return (
		<div className={cn("flex flex-col", className)}>
			{items.map((item, i) => {
				const isOpen = openIds.has(item.id);
				return (
					<div
						key={item.id}
						className={cn(
							"brutal-border",
							i > 0 && "-mt-[3px]"
						)}
					>
						<button
							onClick={() => toggle(item.id)}
							className={cn(
								"w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer",
								"font-black uppercase tracking-wider text-sm",
								"transition-colors",
								isOpen
									? "bg-brutal-yellow"
									: "bg-brutal-white hover:bg-brutal-yellow/20"
							)}
						>
							<span>{item.title}</span>
							<span
								className={cn(
									"text-lg transition-transform",
									isOpen && "rotate-45"
								)}
							>
								+
							</span>
						</button>
						{isOpen && (
							<div className="px-5 py-4 bg-brutal-white brutal-border-t text-sm leading-relaxed">
								{item.content}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}
