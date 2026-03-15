/* eslint-disable react-hooks/rules-of-hooks */
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getApiUrl } from "../lib/utils";
import { Container } from "../components/ui/container";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Tabs } from "../components/ui/tabs";
import { DemoTip } from "../components/ui/demo-tip";

type ChatMessage = { role: "user" | "assistant" | string; content: string };
type TabId = "care" | "products" | "remedies" | "chat" | "ai";

interface ScanResultData {
	hair_group?: string;
	hair_type_confirmed?: string;
	exact_subtype?: string;
	hair_subtype?: string;
	porosity?: string;
	texture?: string;
	curl_pattern?: string;
	scalp_score?: number;
	scalp_condition?: string;
	care_recommendations?: string[];
	ingredients_to_seek?: string[];
	ingredients_to_avoid?: string[];
	debug_metrics?: Record<string, unknown>;
}

interface ResultsLocationState {
	data?: ScanResultData;
	chatHistory?: ChatMessage[];
}

interface Product {
	name: string;
	brand?: string;
	price?: string;
	rating?: string | number;
	category?: string;
	amazon_url?: string;
	badge?: string | null;
	image?: string;
	reason?: string;
	store_description?: string;
	prime?: boolean;
	products_detected?: string[];
	confidence?: number;
}

interface Remedy {
	emoji: string;
	name: string;
	benefit: string;
	ingredients?: string[];
	steps: string;
}

interface ProductScanResult {
	verdict: string;
	reason?: string;
	products_detected?: string[];
	confidence?: number;
}

const FALLBACK_PRODUCTS: Record<string, Product[]> = {
	Coily: [
		{ name: "SheaMoisture Manuka Honey Masque", brand: "SheaMoisture", price: "$14.97", rating: "4.7", category: "Deep Conditioner", amazon_url: "https://www.amazon.com/dp/B01LYARQG0", badge: "Best for 4C", image: "", reason: "Deep moisture for tight coils", store_description: "Ask for SheaMoisture Manuka Honey deep conditioner — dark brown jar." },
		{ name: "Mielle Organics Rosemary Mint Oil", brand: "Mielle", price: "$10.99", rating: "4.8", category: "Scalp Oil", amazon_url: "https://www.amazon.com/dp/B08CJMS7D3", badge: "Viral Pick", image: "", reason: "Promotes scalp health and growth", store_description: "Ask for Mielle Rosemary Mint scalp oil — small dark bottle with red label." },
		{ name: "Aunt Jackie's Curl La La Custard", brand: "Aunt Jackie's", price: "$9.99", rating: "4.5", category: "Curl Definer", amazon_url: "https://www.amazon.com/dp/B004FECWAO", badge: null, image: "", reason: "Defines and moisturises coily strands", store_description: "Ask for Aunt Jackie's curl custard — purple tub." },
		{ name: "TGIN Butter Cream Moisturizer", brand: "TGIN", price: "$12.99", rating: "4.6", category: "Leave-In", amazon_url: "https://www.amazon.com/dp/B01D6K6HGW", badge: null, image: "", reason: "Daily moisture retention", store_description: "Ask for TGIN butter cream moisturizer. Green packaging." },
	],
	Curly: [
		{ name: "DevaCurl SuperCream Coconut Styler", brand: "DevaCurl", price: "$28.00", rating: "4.5", category: "Curl Styler", amazon_url: "https://www.amazon.com/dp/B007X5QDZU", badge: "Best 3A-3C", image: "", reason: "Enhances curl definition without frizz", store_description: "Ask for DevaCurl SuperCream. White bottle." },
		{ name: "SheaMoisture Coconut Curl Enhancer", brand: "SheaMoisture", price: "$11.99", rating: "4.6", category: "Curl Enhancer", amazon_url: "https://www.amazon.com/dp/B07BVNMS9V", badge: null, image: "", reason: "Coconut milk smooths curly patterns", store_description: "Ask for SheaMoisture Coconut and Hibiscus curl enhancing smoothie." },
	],
	Wavy: [
		{ name: "Not Your Mother's Curl Talk Cream", brand: "NYM", price: "$8.99", rating: "4.5", category: "Curl Definer", amazon_url: "https://www.amazon.com/dp/B08CX8ZQSC", badge: "Best 2A-2C", image: "", reason: "Lightweight definition for waves", store_description: "Ask for NYM Curl Talk defining cream. Yellow bottle." },
		{ name: "OGX Coconut Curls Shampoo", brand: "OGX", price: "$7.97", rating: "4.6", category: "Shampoo", amazon_url: "https://www.amazon.com/dp/B0052PA4T8", badge: null, image: "", reason: "Gentle cleanse for wavy hair", store_description: "Ask for OGX Coconut Curls shampoo — brown/gold bottle." },
	],
	Straight: [
		{ name: "Moroccanoil Treatment Original", brand: "Moroccanoil", price: "$44.00", rating: "4.8", category: "Hair Oil", amazon_url: "https://www.amazon.com/dp/B00CGGKLRM", badge: "Viral Pick", image: "", reason: "Adds shine and smoothness to straight hair", store_description: "Ask for Moroccanoil argan oil treatment — gold and brown bottle." },
		{ name: "TRESemmé Keratin Smooth Shampoo", brand: "TRESemmé", price: "$6.94", rating: "4.5", category: "Shampoo", amazon_url: "https://www.amazon.com/dp/B0049X5MHQ", badge: "Best Seller", image: "", reason: "Keratin smooths and straightens", store_description: "Ask for TRESemmé Keratin Smooth shampoo. Black bottle." },
	],
};

function ScanProductModal({ hairType, hairProfile, onClose }: { hairType: string; hairProfile: string; onClose: () => void }) {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const [cameraOn, setCameraOn] = useState(false);
	const [scanning, setScanning] = useState(false);
	const [result, setResult] = useState<ProductScanResult | null>(null);

	useEffect(() => {
		(async () => {
			try {
				const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
				streamRef.current = s;
				if (videoRef.current) videoRef.current.srcObject = s;
				setCameraOn(true);
			} catch { alert("Camera needed to scan products."); onClose(); }
		})();
		return () => streamRef.current?.getTracks().forEach((t) => t.stop());
	}, []);

	const doScan = async () => {
		if (!videoRef.current || !canvasRef.current || scanning) return;
		setScanning(true);
		const v = videoRef.current, c = canvasRef.current;
		c.width = v.videoWidth; c.height = v.videoHeight;
		c.getContext("2d")!.drawImage(v, 0, 0);
		const dataUrl = c.toDataURL("image/jpeg", 0.85);
		try {
			const res = await fetch(`${getApiUrl()}/api/marketplace/scan-product`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: dataUrl, hair_type: hairType, hair_profile: hairProfile }) });
			const json = (await res.json()) as ProductScanResult;
			setResult(json);
		} catch { setResult({ verdict: "ERROR", reason: "Could not connect — check your network." }); } finally { setScanning(false); }
	};

	const verdict = result?.verdict ?? "ERROR";
	const verdictMap: Record<string, { badge: "success" | "danger" | "warning" | "default"; label: string }> = {
		GOOD: { badge: "success", label: "Great for your hair!" },
		BAD: { badge: "danger", label: "Not recommended" },
		OK: { badge: "warning", label: "Use with caution" },
		ERROR: { badge: "default", label: "Try again" },
	};
	const vc = verdictMap[verdict] || verdictMap.ERROR;

	return (
		<div className="fixed inset-0 z-[100] bg-brutal-black flex flex-col">
			<div className="flex items-center justify-between px-4 pt-4 pb-3 brutal-border-b">
				<div>
					<Badge variant="info" className="mb-1">In-Store Mode</Badge>
					<p className="text-brutal-white text-sm font-black uppercase">Scan a Product</p>
				</div>
				<button onClick={onClose} className="text-brutal-white/60 hover:text-brutal-white text-2xl font-black cursor-pointer">&times;</button>
			</div>
			<div className="flex-1 m-3 brutal-border overflow-hidden relative bg-brutal-black">
				<video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
				<canvas ref={canvasRef} className="hidden" />
				{!result && !scanning && (
					<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
						<div className="border-3 border-brutal-sky/60 w-3/4 h-3/5" />
						<p className="absolute bottom-6 text-brutal-sky text-xs font-black tracking-widest uppercase animate-pulse">Point at product label</p>
					</div>
				)}
				{scanning && (
					<div className="absolute inset-0 bg-brutal-black/60 flex flex-col items-center justify-center gap-3">
						<div className="w-10 h-10 border-4 border-brutal-sky/30 border-t-brutal-sky animate-spin" />
						<p className="text-brutal-white text-sm font-black">Kera is reading the label...</p>
					</div>
				)}
				{result && (
					<div className="absolute inset-x-0 bottom-0 bg-brutal-white p-4 brutal-border-t">
						<div className="flex items-center gap-3 mb-2">
							<Badge variant={vc.badge}>{verdict}</Badge>
							<p className="font-black text-sm">{vc.label}</p>
						</div>
						<p className="text-sm text-brutal-black/70">{result.reason}</p>
						{result.products_detected?.[0] && (
							<p className="text-xs text-brutal-black/40 mt-1">{result.products_detected.join(", ")}</p>
						)}
						<Button variant="secondary" size="sm" className="w-full mt-3" onClick={() => setResult(null)}>Scan Another</Button>
					</div>
				)}
			</div>
			<div className="px-3 py-3">
				<Button className="w-full" size="lg" onClick={doScan} disabled={scanning || !cameraOn}>
					{scanning ? "Analysing..." : "Scan This Product"}
				</Button>
			</div>
		</div>
	);
}

export default function ResultsPage() {
	const location = useLocation() as { state?: ResultsLocationState };
	const navigate = useNavigate();
	const data = location.state?.data;
	const chatHistory: ChatMessage[] = location.state?.chatHistory || [];

	const [activeTab, setActiveTab] = useState<TabId>("care");
	const [products, setProducts] = useState<Product[]>([]);
	const [remedies, setRemedies] = useState<Remedy[]>([]);
	const [productsLoading, setProductsLoading] = useState(false);
	const [productSource, setProductSource] = useState("");
	const [storeDescOpen, setStoreDescOpen] = useState<number | null>(null);
	const [showScanProduct, setShowScanProduct] = useState(false);

	const hairGroup_ = data?.hair_group || data?.hair_type_confirmed || "Coily";
	const hairSubtype_ = data?.exact_subtype || data?.hair_subtype || hairGroup_;

	useEffect(() => { if (hairSubtype_) localStorage.setItem("kera_hair_type", hairSubtype_); }, [hairSubtype_]);

	useEffect(() => {
		if (!data || activeTab !== "products") return;
		if (products.length > 0) return;
		setProductsLoading(true);
		fetch(`${getApiUrl()}/api/marketplace/products?hair_type=${hairSubtype_}`)
			.then((r) => r.json())
			.then((d) => { setProducts(d.products || []); setProductSource(d.source || "local"); setProductsLoading(false); })
			.catch(() => { setProducts(FALLBACK_PRODUCTS[hairGroup_] || FALLBACK_PRODUCTS.Coily); setProductSource("offline"); setProductsLoading(false); });
	}, [activeTab, data, hairSubtype_, hairGroup_]);

	useEffect(() => {
		if (!data || activeTab !== "remedies") return;
		if (remedies.length > 0) return;
		fetch(`${getApiUrl()}/api/marketplace/remedies?hair_type=${hairSubtype_}`)
			.then((r) => r.json())
			.then((d) => setRemedies(d.remedies || []))
			.catch(() => {});
	}, [activeTab, data, hairSubtype_]);

	if (!data) {
		return (
			<Container className="py-20 text-center">
				<span className="text-5xl block mb-4">◎</span>
				<h2 className="text-xl font-black uppercase tracking-tight mb-2">No scan data found</h2>
				<p className="text-brutal-black/50 text-sm mb-6">Complete a hair scan to see your personalised results.</p>
				<Button onClick={() => navigate("/scan")}>Start a Scan</Button>
			</Container>
		);
	}

	const hairGroup = data.hair_group || data.hair_type_confirmed || "Coily";
	const hairSubtype = data.exact_subtype || data.hair_subtype || hairGroup;
	const porosity = data.porosity || "—";
	const texture = data.texture || "—";
	const curlPattern = data.curl_pattern || "";
	const scalpScore = data.scalp_score || 0;
	const scalpCond = data.scalp_condition || "Healthy";
	const careRecs = data.care_recommendations || [];
	const seekList = data.ingredients_to_seek || [];
	const avoidList = data.ingredients_to_avoid || [];
	const debug = (data.debug_metrics || {}) as any;

	const scalpPct = (scalpScore / 10) * 100;
	const scalpBadge = scalpScore >= 7 ? "success" : scalpScore >= 4 ? "warning" : "danger";
	const cvConf = Math.round((debug.custom_vision_conf || 0) * 100);
	const mnConf = Math.round((debug.mobilenet_conf || 0) * 100);
	const hairProfile = JSON.stringify({ porosity, texture, scalp: scalpCond });

	const TABS = [
		{ id: "care", label: "Care" },
		{ id: "products", label: "Shop" },
		{ id: "remedies", label: "Remedies" },
		{ id: "chat", label: "Chat" },
		{ id: "ai", label: "AI Data" },
	];

	return (
		<>
			{showScanProduct && <ScanProductModal hairType={hairSubtype} hairProfile={hairProfile} onClose={() => setShowScanProduct(false)} />}

			<Container className="py-6 sm:py-10">
				{/* Header */}
				<div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
					<div>
						<p className="text-xs font-black uppercase tracking-wider text-brutal-black/40 mb-1">Scan Results</p>
						<h1 className="text-5xl sm:text-6xl font-black uppercase tracking-tighter leading-none">{hairSubtype}</h1>
						<p className="text-lg font-black text-brutal-black/50 uppercase">{hairGroup}</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button size="sm" onClick={() => navigate("/scan")}>New Scan</Button>
						<Button size="sm" variant="secondary" onClick={() => setShowScanProduct(true)}>Scan Product</Button>
						<Button size="sm" variant="secondary" onClick={() => navigate("/chat", { state: { data } })}>Ask Kera</Button>
					</div>
				</div>

				{/* Metrics row */}
				<div className="flex flex-wrap gap-2 mb-6">
					<Badge variant="info">{porosity} Porosity</Badge>
					<Badge variant="lavender">{texture} Texture</Badge>
					<Badge variant={scalpBadge as any}>Scalp: {scalpCond}</Badge>
				</div>

				{/* Quick actions */}
				<div className="grid grid-cols-3 gap-3 mb-6">
					{[
						{ label: "Weekly Check", bg: "bg-brutal-lavender", onClick: () => navigate("/weekly", { state: { data } }) },
						{ label: "Shop Now", bg: "bg-brutal-lime", onClick: () => setActiveTab("products") },
						{ label: "Scan Product", bg: "bg-brutal-sky", onClick: () => setShowScanProduct(true) },
					].map((a) => (
						<button key={a.label} onClick={a.onClick} className={`${a.bg} brutal-border brutal-shadow p-3 text-center font-black text-xs uppercase tracking-wider cursor-pointer transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--color-brutal-black)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`}>
							{a.label}
						</button>
					))}
				</div>

				{/* Scalp score */}
				<Card variant="default" padding="md" className="mb-4">
					<div className="flex items-center justify-between mb-3">
						<span className="text-xs font-black uppercase tracking-widest text-brutal-black/40">Scalp Health</span>
						<div className="flex items-baseline gap-1">
							<span className="text-3xl font-black">{scalpScore}</span>
							<span className="text-sm text-brutal-black/40 font-bold">/10</span>
						</div>
					</div>
					<div className="w-full brutal-border-thin h-4 bg-brutal-gray/30">
						<div className={`h-full transition-all duration-700 ${scalpScore >= 7 ? "bg-brutal-lime" : scalpScore >= 4 ? "bg-brutal-yellow" : "bg-brutal-coral"}`} style={{ width: `${scalpPct}%` }} />
					</div>
					<p className="text-xs text-brutal-black/50 mt-2">
						{scalpScore >= 7 ? "Great scalp health — keep it up!" : scalpScore >= 4 ? "Some scalp attention recommended." : "Scalp needs care — see recommendations below."}
					</p>
				</Card>

				{/* Curl pattern */}
				{curlPattern && (
					<Card variant="flat" padding="md" className="mb-4">
						<p className="text-xs font-black uppercase tracking-widest text-brutal-black/40 mb-2">Curl Pattern</p>
						<p className="text-sm leading-relaxed">{curlPattern}</p>
					</Card>
				)}

				{/* Tabs */}
				<Tabs tabs={TABS} active={activeTab} onChange={(id) => setActiveTab(id as TabId)} className="mb-4" />

				{/* Care Tab */}
				{activeTab === "care" && (
					<div className="space-y-4">
						<Card variant="default" padding="md">
							<p className="text-xs font-black uppercase tracking-widest text-brutal-black/40 mb-4">Care Recommendations</p>
							<div className="space-y-3">
								{careRecs.map((tip, i) => (
									<div key={i} className="flex items-start gap-3">
										<span className="w-6 h-6 bg-brutal-yellow brutal-border-thin flex items-center justify-center text-xs font-black shrink-0">{i + 1}</span>
										<p className="text-sm leading-relaxed">{tip}</p>
									</div>
								))}
							</div>
						</Card>
						<Card variant="default" padding="md">
							<p className="text-xs font-black uppercase tracking-widest text-brutal-black/40 mb-4">Ingredients</p>
							<p className="text-[10px] font-black uppercase tracking-widest text-brutal-lime mb-2">Look For</p>
							<div className="flex flex-wrap gap-1.5 mb-4">
								{seekList.map((ing, i) => <Badge key={i} variant="success" className="capitalize">{ing}</Badge>)}
							</div>
							<p className="text-[10px] font-black uppercase tracking-widest text-brutal-coral mb-2">Avoid</p>
							<div className="flex flex-wrap gap-1.5">
								{avoidList.map((ing, i) => <Badge key={i} variant="danger" className="capitalize">{ing}</Badge>)}
							</div>
						</Card>
					</div>
				)}

				{/* Products Tab */}
				{activeTab === "products" && (
					<div className="space-y-3">
						<Badge variant={productSource === "amazon" ? "success" : "default"}>
							{productSource === "amazon" ? "Live Amazon results" : productSource === "offline" ? "Offline — showing local picks" : "Local database"}
						</Badge>
						{productsLoading && (
							<div className="space-y-3">
								{[1, 2, 3].map((i) => (
									<Card key={i} variant="flat" padding="md" className="animate-pulse">
										<div className="flex gap-3">
											<div className="w-16 h-16 bg-brutal-gray/30 shrink-0" />
											<div className="flex-1 space-y-2 pt-1">
												<div className="h-3 bg-brutal-gray/30 w-3/4" />
												<div className="h-3 bg-brutal-gray/30 w-1/2" />
												<div className="h-3 bg-brutal-gray/30 w-1/4" />
											</div>
										</div>
									</Card>
								))}
							</div>
						)}
						{!productsLoading && products.map((p, i) => (
							<Card key={i} variant="default" padding="none">
								<div className="p-4 flex gap-3">
									{p.image ? (
										<img src={p.image} alt={p.name} className="w-16 h-16 object-contain bg-brutal-gray/20 shrink-0 brutal-border-thin" />
									) : (
										<div className="w-16 h-16 bg-brutal-lavender brutal-border-thin flex items-center justify-center text-2xl shrink-0">✦</div>
									)}
									<div className="flex-1 min-w-0">
										<div className="flex items-start justify-between gap-1">
											<p className="text-sm font-black uppercase tracking-tight leading-tight line-clamp-2">{p.name}</p>
											{p.badge && <Badge variant="warning" className="text-[9px] shrink-0">{p.badge}</Badge>}
										</div>
										{p.brand && <p className="text-[10px] font-bold text-brutal-black/40 uppercase tracking-wide mt-0.5">{p.brand}{p.category ? ` · ${p.category}` : ""}</p>}
										<div className="flex items-center justify-between mt-1.5">
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
									<Button size="sm" variant="secondary" onClick={() => setStoreDescOpen(storeDescOpen === i ? null : i)}>Local</Button>
								</div>
								{storeDescOpen === i && p.store_description && (
									<Card variant="lime" padding="sm" className="mx-4 mb-4">
										<p className="text-[10px] font-black uppercase tracking-widest mb-1">Show to store assistant:</p>
										<p className="text-xs leading-relaxed">{p.store_description}</p>
										<Button size="sm" variant="ghost" className="mt-2 text-[10px]" onClick={() => navigator.clipboard?.writeText(p.store_description ?? "")}>Copy</Button>
									</Card>
								)}
							</Card>
						))}
						<Button variant="secondary" className="w-full" onClick={() => navigate("/instore", { state: { data } })}>
							Open In-Store Mode
						</Button>
					</div>
				)}

				{/* Remedies Tab */}
				{activeTab === "remedies" && (
					<div className="space-y-4">
						<Card variant="lime" padding="sm">
							<p className="text-xs font-bold">Natural DIY recipes for <strong>{hairSubtype}</strong> hair — all from your local supermarket.</p>
						</Card>
						{remedies.length === 0 && <p className="text-center text-brutal-black/40 py-6 text-sm">Loading remedies...</p>}
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
									{r.ingredients?.map((ing, j) => <Badge key={j} variant="success" className="text-[10px]">{ing}</Badge>)}
								</div>
								<p className="text-[10px] font-black uppercase tracking-wider text-brutal-black/40 mb-1">Method</p>
								<p className="text-sm text-brutal-black/60 leading-relaxed">{r.steps}</p>
							</Card>
						))}
					</div>
				)}

				{/* Chat Tab */}
				{activeTab === "chat" && (
					<div className="space-y-3">
						<Card variant="flat" padding="sm" className="bg-brutal-black text-brutal-white">
							<p className="text-[10px] font-black uppercase tracking-widest text-brutal-white/40 mb-1">Conversation from scan session</p>
							<p className="text-xs text-brutal-white/60">Everything you asked Kera during your hair scan.</p>
						</Card>
						{chatHistory.length === 0 && (
							<div className="text-center py-8 text-brutal-black/40">
								<span className="text-3xl block mb-2">◆</span>
								<p className="text-sm font-black">No conversation yet</p>
								<p className="text-xs">Ask Kera questions during your next scan.</p>
								<Button size="sm" className="mt-4" onClick={() => navigate("/scan")}>Start a Scan</Button>
							</div>
						)}
						{chatHistory.map((msg, i) => (
							<div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
								<Card
									variant={msg.role === "user" ? "flat" : "default"}
									padding="sm"
									className={`max-w-[85%] ${msg.role === "user" ? "bg-brutal-black text-brutal-white" : ""}`}
								>
									{msg.role === "assistant" && <p className="text-[9px] font-black tracking-widest text-brutal-yellow uppercase mb-1">Kera AI</p>}
									<p className="text-sm leading-relaxed">{msg.content}</p>
								</Card>
							</div>
						))}
						<Button variant="secondary" className="w-full" onClick={() => navigate("/chat", { state: { data } })}>
							Continue Chatting with Kera
						</Button>
					</div>
				)}

				{/* AI Tab */}
				{activeTab === "ai" && (
					<div className="space-y-4">
						<Card variant="default" padding="md">
							<p className="text-xs font-black uppercase tracking-widest text-brutal-black/40 mb-4">AI Model Confidence</p>
							{[
								{ label: "Azure Custom Vision", pred: debug.custom_vision_pred, conf: cvConf, bg: "bg-brutal-yellow" },
								{ label: "MobileNetV3 (Local)", pred: debug.mobilenet_pred, conf: mnConf, bg: "bg-brutal-lavender" },
							].map((m) => (
								<div key={m.label} className="mb-4">
									<div className="flex justify-between items-center mb-1.5">
										<p className="text-xs font-bold">{m.label}</p>
										<div className="flex items-center gap-2">
											<span className="text-xs font-black">{m.pred}</span>
											<Badge variant="default">{m.conf}%</Badge>
										</div>
									</div>
									<div className="w-full brutal-border-thin h-3 bg-brutal-gray/30">
										<div className={`h-full ${m.bg} transition-all duration-700`} style={{ width: `${m.conf}%` }} />
									</div>
								</div>
							))}
							<Card variant="flat" padding="sm" className="flex items-center justify-between">
								<div>
									<p className="text-[10px] font-black uppercase tracking-widest text-brutal-black/40">GPT-5 Discriminator</p>
									<p className="text-sm font-black mt-0.5">{debug.discriminator_resolved || hairGroup}</p>
								</div>
								<Badge variant="success">Resolved</Badge>
							</Card>
						</Card>

						<Card variant="flat" padding="md" className="bg-brutal-black text-brutal-white">
							<p className="text-[10px] font-black uppercase tracking-widest text-brutal-white/40 mb-3">Pipeline</p>
							{[
								{ n: "01", name: "Azure Custom Vision", desc: "CNN trained on 4-class dataset" },
								{ n: "02", name: "MobileNetV3 (Local)", desc: "PyTorch model, 87.1% val accuracy" },
								{ n: "03", name: "GPT-5 Discriminator", desc: "Resolves CNN conflicts via vision" },
								{ n: "04", name: "GPT-5 Care Agent", desc: "Generates personalised JSON profile" },
							].map(({ n, name, desc }) => (
								<div key={n} className="flex items-start gap-3 mb-2">
									<span className="text-[10px] font-black text-brutal-white/30 w-5 shrink-0">{n}</span>
									<div>
										<p className="text-xs font-black text-brutal-white">{name}</p>
										<p className="text-[10px] text-brutal-white/50">{desc}</p>
									</div>
								</div>
							))}
						</Card>
					</div>
				)}

				{/* Demo Tip */}
				<div className="mt-6">
					<DemoTip />
				</div>

				{/* Bottom CTAs */}
				<div className="mt-6 space-y-3">
					<Button className="w-full" size="lg" onClick={() => navigate("/weekly", { state: { data } })}>
						Log Weekly Check
					</Button>
					<div className="grid grid-cols-2 gap-3">
						<Button variant="secondary" onClick={() => navigate("/scan")}>New Scan</Button>
						<Button variant="secondary" onClick={() => navigate("/chat", { state: { data } })}>Ask Kera</Button>
					</div>
				</div>
			</Container>
		</>
	);
}
