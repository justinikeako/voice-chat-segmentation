import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { getApiUrl } from "../lib/utils";
import { Container } from "../components/ui/container";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/input";
import { DemoTip } from "../components/ui/demo-tip";

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

	const loadHistory = () => {
		setLoading(true);
		fetch(`${getApiUrl()}/api/marketplace/hair-history/${userId}`)
			.then((r) => r.json())
			.then((d) => { setHistory(d.history || []); setLoading(false); })
			.catch(() => setLoading(false));
	};

	useEffect(() => { loadHistory(); }, []);

	const startCamera = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
			streamRef.current = stream;
			if (videoRef.current) videoRef.current.srcObject = stream;
			setCameraOn(true);
		} catch { alert("Camera access needed for weekly scan."); }
	};

	const stopCamera = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); setCameraOn(false); };

	useEffect(() => { if (view === "scan") startCamera(); else stopCamera(); return () => stopCamera(); }, [view]);

	const doScan = async () => {
		if (!videoRef.current || !canvasRef.current) return;
		setScanning(true);
		const v = videoRef.current, c = canvasRef.current;
		c.width = v.videoWidth; c.height = v.videoHeight;
		const ctx = c.getContext("2d");
		if (!ctx) { setScanning(false); return; }
		ctx.drawImage(v, 0, 0);
		const dataUrl = c.toDataURL("image/jpeg", 0.8);
		try {
			const res = await fetch(`${getApiUrl()}/api/marketplace/weekly-check`, {
				method: "POST", headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ user_id: userId, image: dataUrl, notes }),
			});
			const data = (await res.json()) as WeeklyCheckResult;
			setResult(data); loadHistory(); setView("result"); stopCamera();
		} catch { alert("Scan failed — check connection"); } finally { setScanning(false); }
	};

	const chartData = history.map((h, i) => ({
		label: `W${i + 1}`,
		date: new Date(h.date ?? Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
		scalp_score: h.scalp_score || 0,
		shrinkage: h.shrinkage_percent || 0,
		is_weekly: h.is_weekly_check,
	}));

	const metricConfig: Record<MetricKey, { label: string; color: string; max: number }> = {
		scalp_score: { label: "Scalp Score", color: "#FFD700", max: 10 },
		shrinkage: { label: "Shrinkage %", color: "#E8D5FF", max: 100 },
	};
	const mc = metricConfig[activeMetric];

	const latest = history.length > 0 ? history[history.length - 1] : null;
	const prev = history.length > 1 ? history[history.length - 2] : null;
	const scoreDelta = latest && prev ? (latest.scalp_score ?? 0) - (prev.scalp_score ?? 0) : 0;

	return (
		<Container className="py-6 sm:py-10">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<p className="text-xs font-black uppercase tracking-wider text-brutal-black/40 mb-1">Hair Journal</p>
					<h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter">Weekly Tracker</h1>
				</div>
				<Button size="sm" onClick={() => setView(view === "scan" ? "history" : "scan")}>
					{view === "scan" ? "View History" : "+ New Check"}
				</Button>
			</div>

			{/* Scan View */}
			{view === "scan" && (
				<div className="space-y-4">
					<Card variant="flat" padding="none" className="overflow-hidden aspect-video relative">
						<video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
						{!cameraOn && (
							<div className="absolute inset-0 flex items-center justify-center text-brutal-black/40 text-sm font-black uppercase">Starting camera...</div>
						)}
						<canvas ref={canvasRef} className="hidden" />
						<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
							<div className="w-40 h-52 border-3 border-brutal-lavender/60" />
						</div>
					</Card>
					<Textarea
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="e.g. Washed hair today, tried new conditioner..."
						label="Notes (optional)"
					/>
					<Button className="w-full" size="lg" onClick={doScan} disabled={scanning || !cameraOn}>
						{scanning ? "Analysing..." : "Run Weekly Check"}
					</Button>
				</div>
			)}

			{/* Result View */}
			{view === "result" && result && (
				<div className="space-y-4">
					<Card variant="highlight" padding="md">
						<Badge variant="success" className="mb-3">Check Complete</Badge>
						<div className="grid grid-cols-2 gap-3">
							{[
								{ label: "Quality", value: `${result.quality_score}/10`, variant: "warning" as const },
								{ label: "Moisture", value: result.moisture_level, variant: "info" as const },
								{ label: "Scalp", value: result.scalp_condition, variant: "success" as const },
								{ label: "Shrinkage", value: `${result.shrinkage_percent || 0}%`, variant: "lavender" as const },
							].map((item) => (
								<Card key={item.label} variant="default" padding="sm">
									<p className="text-[10px] text-brutal-black/40 font-black uppercase tracking-wider">{item.label}</p>
									<p className="text-lg font-black mt-0.5">{item.value}</p>
								</Card>
							))}
						</div>
						{result.weekly_note && (
							<Card variant="flat" padding="sm" className="mt-4">
								<p className="text-sm leading-relaxed">{result.weekly_note}</p>
							</Card>
						)}
						{result.action_needed && (
							<Card variant="coral" padding="sm" className="mt-3">
								<p className="text-[10px] font-black uppercase tracking-widest mb-1">This week's action</p>
								<p className="text-xs">{result.action_needed}</p>
							</Card>
						)}
					</Card>
					<Button variant="secondary" className="w-full" onClick={() => setView("history")}>
						View History &rarr;
					</Button>
				</div>
			)}

			{/* History View */}
			{view === "history" && (
				<div className="space-y-4">
					{latest && (
						<div className="grid grid-cols-3 gap-3">
							{[
								{ label: "Scalp Score", value: `${latest.scalp_score}/10`, delta: scoreDelta },
								{ label: "Checks", value: history.length, delta: null },
								{ label: "Shrinkage", value: `${latest.shrinkage_percent || 0}%`, delta: null },
							].map((s) => (
								<Card key={s.label} variant="default" padding="sm" className="text-center">
									<p className="text-xl font-black">{s.value}</p>
									{s.delta !== null && (
										<p className={`text-[10px] font-black ${s.delta >= 0 ? "text-brutal-lime" : "text-brutal-coral"}`}>
											{s.delta >= 0 ? "+" : ""}{s.delta}
										</p>
									)}
									<p className="text-[9px] uppercase tracking-wider text-brutal-black/40 mt-0.5 font-black">{s.label}</p>
								</Card>
							))}
						</div>
					)}

					{chartData.length > 1 && (
						<Card variant="default" padding="md">
							<div className="flex items-center justify-between mb-3">
								<p className="text-xs font-black uppercase tracking-widest text-brutal-black/40">Trend</p>
								<div className="flex gap-1">
									{Object.entries(metricConfig).map(([key, cfg]) => (
										<button
											key={key}
											onClick={() => setActiveMetric(key as MetricKey)}
											className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider brutal-border-thin transition-colors cursor-pointer ${
												activeMetric === key ? "bg-brutal-yellow" : "bg-brutal-white text-brutal-black/50"
											}`}
										>
											{cfg.label}
										</button>
									))}
								</div>
							</div>
							<ResponsiveContainer width="100%" height={160}>
								<LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
									<CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
									<XAxis dataKey="label" tick={{ fontSize: 10, fill: "#999" }} />
									<YAxis domain={[0, mc.max]} tick={{ fontSize: 10, fill: "#999" }} />
									<Tooltip contentStyle={{ fontSize: 11, border: "3px solid #000", boxShadow: "4px 4px 0 #000" }} formatter={(value) => [value, mc.label]} labelFormatter={(l, p) => p?.[0]?.payload?.date || l} />
									<Line type="monotone" dataKey={activeMetric} stroke={mc.color} strokeWidth={3} dot={{ fill: mc.color, r: 4, stroke: "#000", strokeWidth: 2 }} activeDot={{ r: 6, stroke: "#000", strokeWidth: 2 }} />
									{activeMetric === "scalp_score" && <ReferenceLine y={7} stroke="#BFFF00" strokeDasharray="4 3" strokeWidth={1} />}
								</LineChart>
							</ResponsiveContainer>
						</Card>
					)}

					{/* Timeline */}
					<Card variant="default" padding="none">
						<div className="px-4 pt-4 pb-2">
							<p className="text-xs font-black uppercase tracking-widest text-brutal-black/40">Timeline</p>
						</div>
						{loading && <p className="text-center text-brutal-black/40 text-sm py-6">Loading...</p>}
						{!loading && history.length === 0 && (
							<div className="text-center py-10 text-brutal-black/40">
								<span className="text-3xl block mb-2">▤</span>
								<p className="text-sm font-black">No checks yet</p>
								<p className="text-xs">Tap + New Check to start tracking</p>
							</div>
						)}
						<div className="divide-y divide-brutal-gray/50">
							{[...history].reverse().map((h, i) => (
								<div key={h.id || i} className="px-4 py-3 flex items-start gap-3">
									<div className={`w-8 h-8 brutal-border-thin flex items-center justify-center text-xs font-black shrink-0 ${h.is_weekly_check ? "bg-brutal-lavender" : "bg-brutal-yellow"}`}>
										{h.is_weekly_check ? "W" : "S"}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between">
											<p className="text-sm font-black uppercase tracking-tight">{h.hair_type ? `${h.hair_type} Hair Scan` : "Weekly Check"}</p>
											<p className="text-[10px] text-brutal-black/40">{new Date(h.date ?? Date.now()).toLocaleDateString()}</p>
										</div>
										<div className="flex items-center gap-2 mt-0.5 flex-wrap">
											{(h.scalp_score ?? 0) > 0 && <Badge variant="default" className="text-[9px]">Scalp {h.scalp_score}/10</Badge>}
											{h.moisture_level && <Badge variant="info" className="text-[9px]">{h.moisture_level}</Badge>}
											{(h.shrinkage_percent ?? 0) > 0 && <Badge variant="lavender" className="text-[9px]">{h.shrinkage_percent}%</Badge>}
										</div>
										{h.weekly_note && <p className="text-xs text-brutal-black/40 mt-0.5 truncate">{h.weekly_note}</p>}
									</div>
								</div>
							))}
						</div>
					</Card>
				</div>
			)}

			<div className="mt-6">
				<DemoTip />
			</div>
		</Container>
	);
}
