import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getApiUrl } from "../lib/utils";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Container } from "../components/ui/container";
import { DemoTip } from "../components/ui/demo-tip";

interface HistoryEntry {
	hair_type?: string;
	scalp_score?: number;
	porosity?: string;
	date?: string;
}

const FEATURE_CARDS = [
	{
		id: "scan",
		icon: "◎",
		label: "Hair Scan",
		sub: "Full AI analysis",
		bg: "bg-brutal-yellow",
		route: "/scan",
	},
	{
		id: "weekly",
		icon: "▤",
		label: "Weekly Check",
		sub: "Track changes over time",
		bg: "bg-brutal-lavender",
		route: "/weekly",
	},
	{
		id: "shop",
		icon: "✦",
		label: "Shop",
		sub: "Amazon + local picks",
		bg: "bg-brutal-lime",
		route: "/shop",
	},
	{
		id: "instore",
		icon: "⊞",
		label: "In-Store Mode",
		sub: "Scan a shelf, get advice",
		bg: "bg-brutal-sky",
		route: "/instore",
	},
	{
		id: "learn",
		icon: "△",
		label: "Learn",
		sub: "Understand your hair",
		bg: "bg-brutal-coral",
		route: "/learn",
	},
	{
		id: "chat",
		icon: "◆",
		label: "Ask Kera",
		sub: "Chat with your AI stylist",
		bg: "bg-brutal-white",
		route: "/chat",
	},
];

export default function HomePage() {
	const navigate = useNavigate();
	const [lastScan, setLastScan] = useState<HistoryEntry | null>(null);
	const [history, setHistory] = useState<HistoryEntry[]>([]);
	const userId = localStorage.getItem("kera_user_id") || "1";

	useEffect(() => {
		fetch(`${getApiUrl()}/api/marketplace/hair-history/${userId}`)
			.then((r) => r.json())
			.then((d) => {
				if (d.history?.length) {
					setHistory(d.history);
					const full = [...d.history]
						.reverse()
						.find((h: HistoryEntry) => h.hair_type);
					if (full) setLastScan(full);
				}
			})
			.catch(() => {});
	}, [userId]);

	const scalpBadge = (s: number) =>
		s >= 7 ? "success" : s >= 4 ? "warning" : "danger";

	return (
		<Container className="py-6 sm:py-10">
			{/* Greeting */}
			<div className="mb-8">
				<p className="text-xs font-black uppercase tracking-wider text-brutal-black/40 mb-1">
					Dashboard
				</p>
				<h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter">
					What do you need today?
				</h1>
			</div>

			{/* Last Scan Summary */}
			{lastScan && (
				<Card
					variant="highlight"
					padding="md"
					className="mb-6 cursor-pointer hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--color-brutal-black)] transition-all"
					onClick={() => navigate("/results")}
				>
					<p className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-60">
						Last Scan
					</p>
					<div className="flex items-center gap-4">
						<div className="w-14 h-14 brutal-border bg-brutal-white flex items-center justify-center">
							<span className="text-xl font-black">
								{lastScan.hair_type}
							</span>
						</div>
						<div className="flex-1 min-w-0">
							<p className="font-black text-lg uppercase tracking-tight">
								{lastScan.hair_type} Hair
							</p>
							<div className="flex flex-wrap gap-1.5 mt-1">
								<Badge
									variant={scalpBadge(
										lastScan.scalp_score ?? 0
									)}
								>
									Scalp {lastScan.scalp_score ?? 0}/10
								</Badge>
								<Badge variant="info">
									{lastScan.porosity ?? "Unknown"} Porosity
								</Badge>
								{lastScan.date && (
									<Badge variant="default">
										{new Date(
											lastScan.date
										).toLocaleDateString()}
									</Badge>
								)}
							</div>
						</div>
					</div>
				</Card>
			)}

			{/* Feature Grid */}
			<div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
				{FEATURE_CARDS.map((card) => (
					<button
						key={card.id}
						onClick={() => navigate(card.route)}
						className={`${card.bg} brutal-border brutal-shadow p-4 sm:p-5 text-left transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_var(--color-brutal-black)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer`}
					>
						<span className="text-2xl sm:text-3xl leading-none block mb-3">
							{card.icon}
						</span>
						<p className="font-black text-sm uppercase tracking-tight leading-tight">
							{card.label}
						</p>
						<p className="text-[11px] text-brutal-black/50 mt-0.5">
							{card.sub}
						</p>
					</button>
				))}
			</div>

			{/* Weekly Check CTA */}
			<Card
				variant="flat"
				padding="md"
				className="mt-6 flex items-center gap-4 cursor-pointer hover:bg-brutal-lavender/20 transition-colors"
				onClick={() => navigate("/weekly")}
			>
				<div className="w-12 h-12 bg-brutal-lavender brutal-border-thin flex items-center justify-center shrink-0">
					<span className="text-xl">▤</span>
				</div>
				<div className="flex-1 min-w-0">
					<p className="font-black text-sm uppercase tracking-tight">
						Log today's hair check
					</p>
					<p className="text-xs text-brutal-black/50">
						{history.length} check
						{history.length !== 1 ? "s" : ""} logged
					</p>
				</div>
				<span className="text-brutal-black/30 text-xl">&rarr;</span>
			</Card>

			{/* Demo Tip */}
			<div className="mt-6">
				<DemoTip />
			</div>
		</Container>
	);
}
