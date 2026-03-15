// frontend/src/pages/WeeklyCheckPage.jsx
// Hair quality tracking over time — weekly scan, chart, shrinkage, notes
// npm install recharts  (if not already installed)
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	ReferenceLine,
} from "recharts";
import { BottomNav, DemoTip } from "./HomePage";

const getApiUrl = () => {
	const saved = localStorage.getItem("VITE_API_URL");
	if (saved) return saved;
	const env = process.env.REACT_APP_API_URL;
	if (env) return env;
	if (
		window.location.hostname !== "localhost" &&
		window.location.hostname !== "127.0.0.1"
	)
		return window.location.origin;
	return "http://127.0.0.1:5000";
};

type MetricKey = "scalp_score" | "shrinkage";
type ViewMode = "history" | "scan" | "result";

interface HistoryEntry {
	id?: string | number;
	date?: string;
	hair_type?: string;
	scalp_score?: number;
	shrinkage_percent?: number;
	is_weekly_check?: boolean;
	moisture_level?: string;
	weekly_note?: string;
	notes?: string;
}

interface WeeklyCheckResult {
	quality_score?: number;
	moisture_level?: string;
	scalp_condition?: string;
	shrinkage_percent?: number;
	weekly_note?: string;
	action_needed?: string;
}

export default function WeeklyCheckPage() {
	const navigate = useNavigate();
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const streamRef = useRef<MediaStream | null>(null);

	const [history, setHistory] = useState<HistoryEntry[]>([]);
	const [loading, setLoading] = useState(false);
	const [scanning, setScanning] = useState(false);
	const [cameraOn, setCameraOn] = useState(false);
	const [result, setResult] = useState<WeeklyCheckResult | null>(null);
	const [notes, setNotes] = useState("");
	const [activeMetric, setActiveMetric] = useState<MetricKey>("scalp_score");
	const [view, setView] = useState<ViewMode>("history");

	const userId = localStorage.getItem("kera_user_id") || "1";

	// ── Load history ──────────────────────────────────────────────────────────
	const loadHistory = () => {
		setLoading(true);
		fetch(`${getApiUrl()}/api/marketplace/hair-history/${userId}`)
			.then((r) => r.json())
			.then((d) => {
				setHistory(d.history || []);
				setLoading(false);
			})
			.catch(() => setLoading(false));
	};

	useEffect(() => {
		loadHistory();
	}, []);

	// ── Camera ────────────────────────────────────────────────────────────────
	const startCamera = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: "user" },
			});
			streamRef.current = stream;
			if (videoRef.current) videoRef.current.srcObject = stream;
			setCameraOn(true);
		} catch {
			alert("Camera access needed for weekly scan.");
		}
	};

	const stopCamera = () => {
		streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
		setCameraOn(false);
	};

	useEffect(() => {
		if (view === "scan") startCamera();
		else stopCamera();
		return () => stopCamera();
	}, [view]);

	// ── Capture + submit ──────────────────────────────────────────────────────
	const doScan = async () => {
		if (!videoRef.current || !canvasRef.current) return;
		setScanning(true);
		const v = videoRef.current,
			c = canvasRef.current;
		c.width = v.videoWidth;
		c.height = v.videoHeight;
		const ctx = c.getContext("2d");
		if (!ctx) {
			setScanning(false);
			return;
		}
		ctx.drawImage(v, 0, 0);
		const dataUrl = c.toDataURL("image/jpeg", 0.8);

		try {
			const res = await fetch(`${getApiUrl()}/api/marketplace/weekly-check`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ user_id: userId, image: dataUrl, notes }),
			});
			const data = (await res.json()) as WeeklyCheckResult;
			setResult(data);
			loadHistory();
			setView("result");
			stopCamera();
		} catch {
			alert("Scan failed — check connection");
		} finally {
			setScanning(false);
		}
	};

	// ── Chart data ────────────────────────────────────────────────────────────
	const chartData = history.map((h, i) => ({
		label: `W${i + 1}`,
		date: new Date(h.date ?? Date.now()).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		}),
		scalp_score: h.scalp_score || 0,
		shrinkage: h.shrinkage_percent || 0,
		is_weekly: h.is_weekly_check,
	}));

	const metricConfig: Record<MetricKey, { label: string; color: string; max: number }> = {
		scalp_score: { label: "Scalp Score", color: "#f59e0b", max: 10 },
		shrinkage: { label: "Shrinkage %", color: "#8b5cf6", max: 100 },
	};
	const mc = metricConfig[activeMetric];

	// ── Latest stats ──────────────────────────────────────────────────────────
	const latest = history.length > 0 ? history[history.length - 1] : null;
	const prev = history.length > 1 ? history[history.length - 2] : null;
	const scoreDelta =
		latest && prev ? (latest.scalp_score ?? 0) - (prev.scalp_score ?? 0) : 0;

	return (
		<div className="min-h-screen bg-[#F4F2EE] pb-28">
			{/* ── HEADER ─────────────────────────────────────────────────────────── */}
			<div className="bg-[#1A1A1A] px-6 pt-14 pb-6">
				<button
					onClick={() => navigate("/")}
					className="text-gray-400 text-sm flex items-center gap-1 mb-3 font-semibold"
				>
					<svg
						className="w-4 h-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M15 19l-7-7 7-7"
						/>
					</svg>
					Back
				</button>
				<div className="flex items-center justify-between">
					<div>
						<p className="text-violet-400 text-[10px] font-black tracking-[0.3em] uppercase">
							Hair Journal
						</p>
						<h1 className="text-2xl font-black text-white">Weekly Tracker</h1>
					</div>
					<button
						onClick={() => setView(view === "scan" ? "history" : "scan")}
						className="px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase bg-violet-500 text-white active:opacity-80"
					>
						{view === "scan" ? "View History" : "+ New Check"}
					</button>
				</div>
			</div>

			{/* ── SCAN VIEW ──────────────────────────────────────────────────────── */}
			{view === "scan" && (
				<div className="px-4 pt-4 space-y-4">
					{/* Camera */}
					<div className="bg-black rounded-2xl overflow-hidden aspect-video relative">
						<video
							ref={videoRef}
							autoPlay
							playsInline
							muted
							className="w-full h-full object-cover"
						/>
						{!cameraOn && (
							<div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
								Starting camera…
							</div>
						)}
						<canvas ref={canvasRef} className="hidden" />
						{/* Guide */}
						<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
							<div className="w-40 h-52 border-2 border-violet-400/60 rounded-2xl" />
						</div>
					</div>

					{/* Notes */}
					<div className="bg-white rounded-2xl p-4 shadow-sm">
						<p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
							Add a note (optional)
						</p>
						<textarea
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="e.g. Washed hair today, tried new conditioner..."
							className="w-full text-sm text-gray-700 resize-none outline-none h-16 placeholder:text-gray-300"
						/>
					</div>

					<button
						onClick={doScan}
						disabled={scanning || !cameraOn}
						className="w-full py-4 bg-violet-500 text-white rounded-2xl text-sm font-black tracking-wider uppercase disabled:opacity-50 active:scale-[0.98] transition-transform"
					>
						{scanning ? "Analysing…" : "📊 Run Weekly Check"}
					</button>
				</div>
			)}

			{/* ── RESULT VIEW ────────────────────────────────────────────────────── */}
			{view === "result" && result && (
				<div className="px-4 pt-4 space-y-3">
					<div className="bg-white rounded-2xl shadow-sm p-5">
						<p className="text-xs font-black uppercase tracking-widest text-violet-500 mb-4">
							✅ Check Complete
						</p>
						<div className="grid grid-cols-2 gap-3">
							{[
								{
									label: "Quality Score",
									value: `${result.quality_score}/10`,
									color: "#f59e0b",
								},
								{
									label: "Moisture",
									value: result.moisture_level,
									color: "#06b6d4",
								},
								{
									label: "Scalp",
									value: result.scalp_condition,
									color: "#10b981",
								},
								{
									label: "Shrinkage",
									value: `${result.shrinkage_percent || 0}%`,
									color: "#8b5cf6",
								},
							].map((item) => (
								<div key={item.label} className="bg-gray-50 rounded-xl p-3">
									<p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
										{item.label}
									</p>
									<p
										className="text-lg font-black mt-0.5"
										style={{ color: item.color }}
									>
										{item.value}
									</p>
								</div>
							))}
						</div>
						{result.weekly_note && (
							<p className="mt-4 text-gray-600 text-sm leading-relaxed bg-gray-50 rounded-xl p-3">
								💬 {result.weekly_note}
							</p>
						)}
						{result.action_needed && (
							<div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
								<p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">
									This week's action
								</p>
								<p className="text-amber-800 text-xs">{result.action_needed}</p>
							</div>
						)}
					</div>
					<button
						onClick={() => setView("history")}
						className="w-full py-3 border border-gray-200 rounded-2xl text-sm font-black text-gray-600"
					>
						View History →
					</button>
				</div>
			)}

			{/* ── HISTORY VIEW ───────────────────────────────────────────────────── */}
			{view === "history" && (
				<div className="px-4 pt-4 space-y-4">
					{/* Stats row */}
					{latest && (
						<div className="grid grid-cols-3 gap-2">
							{[
								{
									label: "Scalp Score",
									value: `${latest.scalp_score}/10`,
									delta: scoreDelta,
									icon: "🧠",
								},
								{
									label: "Checks",
									value: history.length,
									delta: null,
									icon: "📋",
								},
								{
									label: "Shrinkage",
									value: `${latest.shrinkage_percent || 0}%`,
									delta: null,
									icon: "📏",
								},
							].map((s) => (
								<div
									key={s.label}
									className="bg-white rounded-2xl p-3 shadow-sm text-center"
								>
									<p className="text-lg">{s.icon}</p>
									<p className="text-lg font-black text-gray-900">{s.value}</p>
									{s.delta !== null && (
										<p
											className={`text-[10px] font-bold ${s.delta >= 0 ? "text-green-500" : "text-red-500"}`}
										>
											{s.delta >= 0 ? "↑" : "↓"} {Math.abs(s.delta)}
										</p>
									)}
									<p className="text-[9px] uppercase tracking-wider text-gray-400 mt-0.5">
										{s.label}
									</p>
								</div>
							))}
						</div>
					)}

					{/* Chart */}
					{chartData.length > 1 && (
						<div className="bg-white rounded-2xl shadow-sm p-4">
							<div className="flex items-center justify-between mb-3">
								<p className="text-xs font-black uppercase tracking-widest text-gray-500">
									Trend
								</p>
								<div className="flex gap-1">
									{Object.entries(metricConfig).map(([key, cfg]) => (
										<button
											key={key}
											onClick={() => setActiveMetric(key as MetricKey)}
											className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
												activeMetric === key
													? "text-white"
													: "bg-gray-100 text-gray-500"
											}`}
											style={
												activeMetric === key
													? { backgroundColor: cfg.color }
													: {}
											}
										>
											{cfg.label}
										</button>
									))}
								</div>
							</div>
							<ResponsiveContainer width="100%" height={160}>
								<LineChart
									data={chartData}
									margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
								>
									<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
									<XAxis
										dataKey="label"
										tick={{ fontSize: 10, fill: "#9ca3af" }}
									/>
									<YAxis
										domain={[0, mc.max]}
										tick={{ fontSize: 10, fill: "#9ca3af" }}
									/>
									<Tooltip
										contentStyle={{
											fontSize: 11,
											borderRadius: 8,
											border: "none",
											boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
										}}
										formatter={(value) => [value, mc.label]}
										labelFormatter={(l, p) => p?.[0]?.payload?.date || l}
									/>
									<Line
										type="monotone"
										dataKey={activeMetric}
										stroke={mc.color}
										strokeWidth={2.5}
										dot={{ fill: mc.color, r: 4 }}
										activeDot={{ r: 6 }}
									/>
									{activeMetric === "scalp_score" && (
										<ReferenceLine
											y={7}
											stroke="#22c55e"
											strokeDasharray="4 3"
											strokeWidth={1}
										/>
									)}
								</LineChart>
							</ResponsiveContainer>
						</div>
					)}

					{/* Timeline */}
					<div className="bg-white rounded-2xl shadow-sm overflow-hidden">
						<div className="px-4 pt-4 pb-2">
							<p className="text-xs font-black uppercase tracking-widest text-gray-500">
								Timeline
							</p>
						</div>
						{loading && (
							<p className="text-center text-gray-400 text-sm py-6">Loading…</p>
						)}
						{!loading && history.length === 0 && (
							<div className="text-center py-10 text-gray-400">
								<p className="text-3xl mb-2">📅</p>
								<p className="text-sm font-semibold">No checks yet</p>
								<p className="text-xs">Tap + New Check to start tracking</p>
							</div>
						)}
						<div className="divide-y divide-gray-50">
							{[...history].reverse().map((h, i) => (
								<div
									key={h.id || i}
									className="px-4 py-3 flex items-start gap-3"
								>
									<div
										className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${h.is_weekly_check ? "bg-violet-100" : "bg-amber-100"}`}
									>
										{h.is_weekly_check ? "📊" : "📡"}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between">
											<p className="text-sm font-black text-gray-900">
												{h.hair_type
													? `${h.hair_type} Hair Scan`
													: "Weekly Check"}
											</p>
											<p className="text-[10px] text-gray-400">
												{new Date(h.date ?? Date.now()).toLocaleDateString()}
											</p>
										</div>
										<div className="flex items-center gap-2 mt-0.5 flex-wrap">
											{(h.scalp_score ?? 0) > 0 && (
												<span className="text-[10px] font-bold text-gray-500">
													Scalp {h.scalp_score}/10
												</span>
											)}
											{h.moisture_level && (
												<span className="text-[10px] text-cyan-600 font-bold">
													{h.moisture_level} moisture
												</span>
											)}
											{(h.shrinkage_percent ?? 0) > 0 && (
												<span className="text-[10px] text-violet-600 font-bold">
													{h.shrinkage_percent}% shrinkage
												</span>
											)}
										</div>
										{h.weekly_note && (
											<p className="text-xs text-gray-400 mt-0.5 truncate">
												{h.weekly_note}
											</p>
										)}
										{h.notes && (
											<p className="text-xs text-gray-300 italic truncate">
												{h.notes}
											</p>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}

			<DemoTip />

			<BottomNav active="weekly" />
		</div>
	);
}
