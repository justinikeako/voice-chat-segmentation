import { cn } from "../../lib/utils";
import { Badge } from "./badge";
import { Button } from "./button";

type Product = {
	name: string;
	brand?: string;
	price?: string;
	reason?: string;
	url?: string;
	image_url?: string;
	local_description?: string;
	category?: string;
};

type ProductCardProps = {
	product: Product;
	onBuy?: (product: Product) => void;
	onCopyLocal?: (description: string) => void;
	className?: string;
};

export function ProductCard({
	product,
	onBuy,
	onCopyLocal,
	className,
}: ProductCardProps) {
	return (
		<div
			className={cn(
				"bg-brutal-white brutal-border brutal-shadow flex flex-col",
				className
			)}
		>
			{product.image_url && (
				<div className="h-40 brutal-border-b bg-brutal-gray/30 overflow-hidden">
					<img
						src={product.image_url}
						alt={product.name}
						className="w-full h-full object-contain p-2"
					/>
				</div>
			)}
			<div className="p-4 flex flex-col gap-2 flex-1">
				{product.category && (
					<Badge variant="lavender" className="self-start text-[10px]">
						{product.category}
					</Badge>
				)}
				<h4 className="font-black text-sm uppercase tracking-wide leading-tight">
					{product.name}
				</h4>
				{product.brand && (
					<span className="text-xs font-bold text-brutal-black/60 uppercase">
						{product.brand}
					</span>
				)}
				{product.reason && (
					<p className="text-xs text-brutal-black/70 leading-relaxed">
						{product.reason}
					</p>
				)}
				{product.price && (
					<span className="font-black text-lg mt-auto">
						{product.price}
					</span>
				)}
				<div className="flex gap-2 mt-2">
					{product.url && (
						<Button
							size="sm"
							variant="primary"
							onClick={() => onBuy?.(product)}
							className="flex-1"
						>
							Buy
						</Button>
					)}
					{product.local_description && (
						<Button
							size="sm"
							variant="secondary"
							onClick={() =>
								onCopyLocal?.(product.local_description!)
							}
							className="flex-1"
						>
							Local
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
