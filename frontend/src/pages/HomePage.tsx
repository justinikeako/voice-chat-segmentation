// frontend/src/pages/HomePage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const getApiUrl = () => {
	const saved = localStorage.getItem("VITE_API_URL");
	if (saved) return saved;
	const env = import.meta.env.REACT_APP_API_URL;
	if (env) return env;
	if (
		window.location.hostname !== "localhost" &&
		window.location.hostname !== "127.0.0.1"
	)
		return window.location.origin;
	return "http://127.0.0.1:5000";
};

type FeatureCardColor =
	| "from-amber-500 to-yellow-400"
	| "from-violet-500 to-purple-400"
	| "from-emerald-500 to-green-400"
	| "from-sky-500 to-blue-400"
	| "from-lime-500 to-green-400"
	| "from-pink-500 to-rose-400";

interface HistoryEntry {
	hair_type?: string;
	scalp_score?: number;
	porosity?: string;
	date?: string;
}

const FEATURE_CARDS: {
	id: string;
	emoji: string;
	label: string;
	sub: string;
	color: FeatureCardColor;
	route: string;
}[] = [
	{
		id: "scan",
		emoji: "📡",
		label: "Hair Scan",
		sub: "Full AI analysis",
		color: "from-amber-500 to-yellow-400",
		route: "/scan",
	},
	{
		id: "weekly",
		emoji: "📊",
		label: "Weekly Check",
		sub: "Track changes over time",
		color: "from-violet-500 to-purple-400",
		route: "/weekly",
	},
	{
		id: "shop",
		emoji: "🛍️",
		label: "Shop",
		sub: "Amazon + local picks",
		color: "from-emerald-500 to-green-400",
		route: "/shop",
	},
	{
		id: "instore",
		emoji: "🔍",
		label: "In-Store Mode",
		sub: "Scan a shelf, get advice",
		color: "from-sky-500 to-blue-400",
		route: "/instore",
	},
	{
		id: "remedies",
		emoji: "🌿",
		label: "Natural Remedies",
		sub: "DIY hair recipes",
		color: "from-lime-500 to-green-400",
		route: "/remedies",
	},
	{
		id: "learn",
		emoji: "📚",
		label: "Learn",
		sub: "Understand your hair",
		color: "from-pink-500 to-rose-400",
		route: "/learn",
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
					// Most recent full scan (has hair_type)
					const full = [...d.history].reverse().find((h) => h.hair_type);
					if (full) setLastScan(full);
				}
			})
			.catch(() => {});
	}, [userId]);

	const scalpColor = (s: number) =>
		s >= 7 ? "#22c55e" : s >= 4 ? "#f97316" : "#ef4444";

	return (
		<div className="min-h-screen bg-[#F4F2EE] pb-28">
			{/* ── HEADER ───────────────────────────────────────────────────────── */}
			<div className="bg-[#1A1A1A] px-6 pt-14 pb-8 relative overflow-hidden">
				{/* Gold orb */}
				<div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />
				<button
					onClick={() => navigate("/profile")}
					className="absolute top-5 right-5 text-gray-500 hover:text-white transition-colors"
				>
					<svg
						className="w-5 h-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
						/>
					</svg>
				</button>

				<p className="text-amber-400/80 text-[10px] font-black tracking-[0.3em] uppercase mb-1">
					Your AI Hair Expert
				</p>
				<h1 className="text-3xl font-black text-white leading-tight">
					Kera <span className="text-amber-400">AI</span>
				</h1>
				<p className="text-gray-400 text-sm mt-1">
					Afro-Caribbean hair & scalp intelligence
				</p>

				{/* Last scan summary pill */}
				{lastScan && (
					<div className="mt-5 flex items-center gap-3 bg-white/8 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10">
						<div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center text-lg">
							💇
						</div>
						<div className="flex-1">
							<p className="text-white text-sm font-black">
								{lastScan.hair_type} Hair
							</p>
							<p className="text-gray-400 text-[11px]">
								Scalp {lastScan.scalp_score ?? 0}/10 ·{" "}
								{lastScan.porosity ?? "unknown"} porosity ·{" "}
								{lastScan.date
									? new Date(lastScan.date).toLocaleDateString()
									: "Unknown date"}
							</p>
						</div>
						<div
							className="w-2.5 h-2.5 rounded-full"
							style={{ backgroundColor: scalpColor(lastScan.scalp_score ?? 0) }}
						/>
					</div>
				)}
			</div>

			{/* ── FEATURE GRID ─────────────────────────────────────────────────── */}
			<div className="px-4 pt-6">
				<p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-4">
					What do you need today?
				</p>
				<div className="grid grid-cols-2 gap-3">
					{FEATURE_CARDS.map((card) => (
						<button
							key={card.id}
							onClick={() => navigate(card.route)}
							className={`relative overflow-hidden rounded-2xl p-5 text-left active:scale-95 transition-transform shadow-sm`}
							style={{
								background: `linear-gradient(135deg, ${getGradient(card.color)})`,
							}}
						>
							<div className="absolute -bottom-3 -right-3 text-5xl opacity-20 select-none">
								{card.emoji}
							</div>
							<p className="text-2xl mb-2">{card.emoji}</p>
							<p className="text-white text-sm font-black leading-tight">
								{card.label}
							</p>
							<p className="text-white/70 text-[11px] mt-0.5">{card.sub}</p>
						</button>
					))}
				</div>
			</div>

			{/* ── QUICK WEEKLY CHECK CTA ────────────────────────────────────────── */}
			<div className="mx-4 mt-5">
				<button
					onClick={() => navigate("/weekly")}
					className="w-full bg-[#1A1A1A] rounded-2xl p-5 flex items-center gap-4 active:scale-[0.98] transition-transform shadow-sm"
				>
					<div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-xl">
						📅
					</div>
					<div className="flex-1 text-left">
						<p className="text-white text-sm font-black">
							Log today's hair check
						</p>
						<p className="text-gray-400 text-xs">
							Keep your streak alive · {history.length} check
							{history.length !== 1 ? "s" : ""} logged
						</p>
					</div>
					<svg
						className="w-5 h-5 text-violet-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</button>
			</div>

			{/* ── DEMO TIP ─────────────────────────────────────────────────────── */}
			<DemoTip />

			{/* ── BOTTOM NAV ───────────────────────────────────────────────────── */}
			<BottomNav active="home" />
		</div>
	);
}

// Helper: extract gradient stops from Tailwind class string
function getGradient(cls: FeatureCardColor) {
	const map: Record<FeatureCardColor, string> = {
		"from-amber-500 to-yellow-400": "#f59e0b, #facc15",
		"from-violet-500 to-purple-400": "#8b5cf6, #a78bfa",
		"from-emerald-500 to-green-400": "#10b981, #4ade80",
		"from-sky-500 to-blue-400": "#0ea5e9, #60a5fa",
		"from-lime-500 to-green-400": "#84cc16, #4ade80",
		"from-pink-500 to-rose-400": "#ec4899, #fb7185",
	};
	return map[cls] || "#f59e0b, #facc15";
}

export function DemoTip({ dark = false }: { dark?: boolean }) {
	return dark ? (
		<div className="mx-4 mt-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
			<p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">
				💡 Tip
			</p>
			<p className="text-amber-200 text-xs leading-relaxed">
				Say <strong>"how does my hair look today?"</strong> on the scan page —
				Kera will give you a live hair read out loud.
			</p>
		</div>
	) : (
		<div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4">
			<p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">
				💡 Tip
			</p>
			<p className="text-amber-800 text-xs leading-relaxed">
				Say <strong>"how does my hair look today?"</strong> on the scan page —
				Kera will give you a live hair read out loud.
			</p>
		</div>
	);
}

export function BottomNav({ active }: { active: string }) {
	const navigate = useNavigate();
	const items = [
		{ id: "home", icon: "🏠", label: "Home", route: "/" },
		{ id: "scan", icon: "📡", label: "Scan", route: "/scan" },
		{ id: "shop", icon: "🛍️", label: "Shop", route: "/shop" },
		{ id: "learn", icon: "📚", label: "Learn", route: "/learn" },
		{ id: "weekly", icon: "📊", label: "History", route: "/weekly" },
	];
	return (
		<div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 z-50 shadow-lg">
			<div className="flex justify-around max-w-md mx-auto">
				{items.map((item) => (
					<button
						key={item.id}
						onClick={() => navigate(item.route)}
						className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${active === item.id ? "text-amber-500" : "text-gray-400"}`}
					>
						<span className="text-lg">{item.icon}</span>
						<span className="text-[9px] font-black tracking-wider uppercase">
							{item.label}
						</span>
					</button>
				))}
			</div>
		</div>
	);
}
