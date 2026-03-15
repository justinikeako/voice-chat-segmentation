import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getApiUrl } from "../lib/utils";
import { Container } from "../components/ui/container";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Tabs } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { DemoTip } from "../components/ui/demo-tip";

type ShopTab = "amazon" | "remedies" | "stores";
type Category = "All" | "Shampoo" | "Conditioner" | "Oil" | "Styler";

interface Product {
	name?: string;
	brand?: string;
	reason?: string;
	image?: string;
	price?: string;
	rating?: string | number;
	prime?: boolean;
	amazon_url?: string;
	store_description?: string;
}

interface Remedy {
	emoji?: string;
	name?: string;
	benefit?: string;
	ingredients: string[];
	steps?: string;
}

interface Store {
	type?: string;
	name?: string;
	verified?: boolean;
	location?: string;
	phone?: string;
	website?: string;
}

const CATEGORIES: Category[] = ["All", "Shampoo", "Conditioner", "Oil", "Styler"];

export default function ShopPage() {
	const navigate = useNavigate();
	const location = useLocation() as { state?: { data?: { exact_subtype?: string; hair_type?: string } } };
	const passedData = location.state?.data;

	const hairType =
		passedData?.exact_subtype ||
		passedData?.hair_type ||
		localStorage.getItem("kera_hair_type") ||
		"4C";

	const [tab, setTab] = useState<ShopTab>("amazon");
	const [category, setCategory] = useState<Category>("All");
	const [searchQuery, setSearchQuery] = useState("");
	const [products, setProducts] = useState<Product[]>([]);
	const [remedies, setRemedies] = useState<Remedy[]>([]);
	const [stores, setStores] = useState<Store[]>([]);
	const [loading, setLoading] = useState(false);
	const [source, setSource] = useState("");
	const [storeDesc, setStoreDesc] = useState<number | null>(null);

	const loadProducts = (cat: Category) => {
		setLoading(true);
		const params = new URLSearchParams({ hair_type: hairType });
		if (cat && cat !== "All") params.append("category", cat);
		fetch(`${getApiUrl()}/api/marketplace/products?${params}`)
			.then((r) => r.json())
			.then((d) => { setProducts(d.products || []); setSource(d.source); setLoading(false); })
			.catch(() => setLoading(false));
	};

	const loadRemedies = () => {
		setLoading(true);
		fetch(`${getApiUrl()}/api/marketplace/remedies?hair_type=${hairType}`)
			.then((r) => r.json())
			.then((d) => { setRemedies(d.remedies || []); setLoading(false); })
			.catch(() => setLoading(false));
	};

	const loadStores = () => {
		setLoading(true);
		fetch(`${getApiUrl()}/api/marketplace/local-stores`)
			.then((r) => r.json())
			.then((d) => { setStores(d.stores || []); setLoading(false); })
			.catch(() => setLoading(false));
	};

	useEffect(() => {
		if (tab === "amazon") loadProducts(category);
		if (tab === "remedies") loadRemedies();
		if (tab === "stores") loadStores();
	}, [tab, category]);

	useEffect(() => {
		if (hairType) localStorage.setItem("kera_hair_type", hairType);
	}, [hairType]);

	const SHOP_TABS = [
		{ id: "amazon", label: "Products" },
		{ id: "remedies", label: "Remedies" },
		{ id: "stores", label: "Stores" },
	];

	return (
		<Container className="py-6 sm:py-10">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<p className="text-xs font-black uppercase tracking-wider text-brutal-black/40 mb-1">Shop</p>
					<h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter">
						Products for <span className="text-brutal-yellow">{hairType}</span>
					</h1>
				</div>
				<Button size="sm" variant="secondary" onClick={() => navigate("/instore", { state: { data: passedData } })}>
					In-Store
				</Button>
			</div>

			{/* Tabs */}
			<Tabs tabs={SHOP_TABS} active={tab} onChange={(id) => setTab(id as ShopTab)} className="mb-6" />

			{/* Amazon Tab */}
			{tab === "amazon" && (
				<div className="space-y-4">
					<Input
						type="text"
						placeholder="Search products..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>

					{/* Category filter */}
					<div className="flex gap-2 overflow-x-auto pb-1">
						{CATEGORIES.map((c) => (
							<button
								key={c}
								onClick={() => setCategory(c)}
								className={`shrink-0 px-3 py-1.5 text-xs font-black uppercase tracking-wider brutal-border-thin transition-colors cursor-pointer ${
									category === c
										? "bg-brutal-yellow text-brutal-black"
										: "bg-brutal-white text-brutal-black/50 hover:bg-brutal-black/5"
								}`}
							>
								{c}
							</button>
						))}
					</div>

					{source && (
						<Badge variant={source === "amazon" ? "success" : "default"}>
							{source === "amazon" ? "Live Amazon results" : "Local database — offline"}
						</Badge>
					)}

					{loading && (
						<div className="space-y-3">
							{[1, 2, 3].map((i) => (
								<Card key={i} variant="flat" padding="md" className="animate-pulse">
									<div className="flex gap-3">
										<div className="w-16 h-16 bg-brutal-gray/30 shrink-0" />
										<div className="flex-1 space-y-2">
											<div className="h-3 bg-brutal-gray/30 w-3/4" />
											<div className="h-3 bg-brutal-gray/30 w-1/2" />
											<div className="h-3 bg-brutal-gray/30 w-1/4" />
										</div>
									</div>
								</Card>
							))}
						</div>
					)}

					{!loading &&
						products
							.filter((p) => {
								if (!searchQuery.trim()) return true;
								const q = searchQuery.toLowerCase();
								return (p.name || "").toLowerCase().includes(q) || (p.brand || "").toLowerCase().includes(q) || (p.reason || "").toLowerCase().includes(q);
							})
							.map((p, i) => (
								<Card key={i} variant="default" padding="none">
									<div className="p-4 flex gap-3">
										{p.image ? (
											<img src={p.image} alt={p.name} className="w-16 h-16 object-contain bg-brutal-gray/20 shrink-0 brutal-border-thin" />
										) : (
											<div className="w-16 h-16 bg-brutal-lime brutal-border-thin flex items-center justify-center text-2xl shrink-0">✦</div>
										)}
										<div className="flex-1 min-w-0">
											<p className="text-sm font-black uppercase tracking-tight leading-tight line-clamp-2">{p.name}</p>
											{p.brand && <p className="text-[11px] text-brutal-black/40 font-bold mt-0.5">{p.brand}</p>}
											<div className="flex items-center gap-2 mt-1">
												{p.price && p.price !== "N/A" && <span className="text-sm font-black">{p.price}</span>}
												{p.prime && <Badge variant="info" className="text-[9px]">Prime</Badge>}
											</div>
										</div>
									</div>
									{p.reason && <div className="px-4 py-2 brutal-border-t text-xs text-brutal-black/50">{p.reason}</div>}
									<div className="px-4 pb-4 flex gap-2 pt-2">
										{p.amazon_url && (
											<a href={p.amazon_url} target="_blank" rel="noopener noreferrer" className="flex-1">
												<Button size="sm" className="w-full">Buy on Amazon</Button>
											</a>
										)}
										<Button size="sm" variant="secondary" onClick={() => setStoreDesc(storeDesc === i ? null : i)}>Local</Button>
									</div>
									{storeDesc === i && p.store_description && (
										<Card variant="lime" padding="sm" className="mx-4 mb-4">
											<p className="text-[10px] font-black uppercase tracking-widest mb-1">Show to store assistant:</p>
											<p className="text-xs leading-relaxed">{p.store_description}</p>
											<Button size="sm" variant="ghost" className="mt-2 text-[10px]" onClick={() => navigator.clipboard?.writeText(p.store_description ?? "")}>Copy</Button>
										</Card>
									)}
								</Card>
							))}
				</div>
			)}

			{/* Remedies Tab */}
			{tab === "remedies" && (
				<div className="space-y-4">
					<Card variant="lime" padding="sm">
						<p className="text-xs font-bold">Natural DIY recipes for <strong>{hairType}</strong> hair — all from your local supermarket.</p>
					</Card>
					{loading && <p className="text-center text-brutal-black/40 py-6">Loading...</p>}
					{remedies.map((r, i) => (
						<Card key={i} variant="default" padding="md">
							<div className="flex items-center gap-3 mb-3">
								<span className="text-2xl">{r.emoji}</span>
								<div>
									<p className="font-black text-sm uppercase">{r.name}</p>
									<p className="text-[11px] text-brutal-lime font-bold">{r.benefit}</p>
								</div>
							</div>
							<p className="text-[10px] font-black uppercase tracking-wider text-brutal-black/40 mb-2">Ingredients</p>
							<div className="flex flex-wrap gap-1.5 mb-3">
								{r.ingredients.map((ing, j) => <Badge key={j} variant="success" className="text-[10px]">{ing}</Badge>)}
							</div>
							<p className="text-[10px] font-black uppercase tracking-wider text-brutal-black/40 mb-1">Method</p>
							<p className="text-sm text-brutal-black/60 leading-relaxed">{r.steps}</p>
						</Card>
					))}
				</div>
			)}

			{/* Stores Tab */}
			{tab === "stores" && (
				<div className="space-y-3">
					<Card variant="lavender" padding="sm">
						<p className="text-xs font-bold">Local Jamaican hair & beauty stores that stock products for your hair type.</p>
					</Card>
					{loading && <p className="text-center text-brutal-black/40 py-6">Loading...</p>}
					{stores.map((s, i) => (
						<Card key={i} variant="default" padding="md">
							<div className="flex items-start gap-3">
								<div className="w-10 h-10 bg-brutal-sky brutal-border-thin flex items-center justify-center text-lg shrink-0">
									{s.type === "Pharmacy" ? "+" : s.type === "Natural Beauty" ? "◇" : "◆"}
								</div>
								<div className="flex-1">
									<div className="flex items-center gap-2">
										<p className="font-black text-sm uppercase">{s.name}</p>
										{s.verified && <Badge variant="success" className="text-[9px]">Verified</Badge>}
									</div>
									<p className="text-xs text-brutal-black/40 mt-0.5">{s.location} &middot; {s.type}</p>
									{s.phone && <p className="text-xs font-bold mt-1">{s.phone}</p>}
								</div>
							</div>
							<div className="flex gap-2 mt-3">
								{s.phone && <a href={`tel:${s.phone}`} className="flex-1"><Button size="sm" variant="secondary" className="w-full">Call</Button></a>}
								{s.website && <a href={s.website} target="_blank" rel="noopener noreferrer" className="flex-1"><Button size="sm" variant="secondary" className="w-full">Website</Button></a>}
								<a href={`https://www.google.com/maps/search/${encodeURIComponent(s.name + " " + s.location)}`} target="_blank" rel="noopener noreferrer" className="flex-1">
									<Button size="sm" className="w-full">Map</Button>
								</a>
							</div>
						</Card>
					))}
				</div>
			)}

			<div className="mt-6">
				<DemoTip />
			</div>
		</Container>
	);
}
