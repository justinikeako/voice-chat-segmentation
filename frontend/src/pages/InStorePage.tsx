import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getApiUrl } from "../lib/utils";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

interface ScanData {
	exact_subtype?: string;
	porosity?: string;
	texture?: string;
	scalp_condition?: string;
}

interface InStoreResult {
	verdict: string;
	reason?: string;
	recommendation?: string;
	products_detected?: string[];
	confidence?: number;
	key_ingredients_found?: string[];
	ingredients_to_avoid_found?: string[];
	timestamp?: string;
}

export default function InStorePage() {
	const navigate = useNavigate();
	const location = useLocation() as { state?: { data?: ScanData } };
	const passedData = location.state?.data;

	const hairType = passedData?.exact_subtype || localStorage.getItem("kera_hair_type") || "4C";
	const hairProfile = passedData
		? JSON.stringify({ porosity: passedData.porosity, texture: passedData.texture, scalp: passedData.scalp_condition })
		: "";

	const videoRef = useRef<HTMLVideoElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const startingRef = useRef(false);

	const [cameraOn, setCameraOn] = useState(false);
	const [scanning, setScanning] = useState(false);
	const [result, setResult] = useState<InStoreResult | null>(null);
	const [history, setHistory] = useState<InStoreResult[]>([]);
	const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

	const startCamera = async () => {
		if (startingRef.current) return;
		startingRef.current = true;
		try {
			streamRef.current?.getTracks().forEach((t) => t.stop());
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
			});
			streamRef.current = stream;
			if (videoRef.current) videoRef.current.srcObject = stream;
			setCameraOn(true);
		} catch { alert("Camera access needed."); } finally { startingRef.current = false; }
	};

	useEffect(() => { startCamera(); return () => streamRef.current?.getTracks().forEach((t) => t.stop()); }, [facingMode]);

	const doScan = async () => {
		if (!videoRef.current || !canvasRef.current || scanning) return;
		setScanning(true); setResult(null);
		const v = videoRef.current, c = canvasRef.current;
		c.width = v.videoWidth; c.height = v.videoHeight;
		const ctx = c.getContext("2d");
		if (!ctx) { setScanning(false); return; }
		ctx.drawImage(v, 0, 0);
		const dataUrl = c.toDataURL("image/jpeg", 0.85);
		try {
			const res = await fetch(`${getApiUrl()}/api/marketplace/scan-product`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ image: dataUrl, hair_type: hairType, hair_profile: hairProfile }),
			});
			const data = (await res.json()) as InStoreResult;
			setResult(data);
			setHistory((h) => [{ ...data, timestamp: new Date().toLocaleTimeString() }, ...h].slice(0, 5));
		} catch { setResult({ verdict: "ERROR", reason: "Could not analyse — check connection." }); } finally { setScanning(false); }
	};

	const verdictBadge: Record<string, "success" | "danger" | "warning" | "default"> = {
		GOOD: "success", BAD: "danger", OK: "warning", ERROR: "default",
	};
	const verdictLabel: Record<string, string> = {
		GOOD: "Great Choice!", BAD: "Not For You", OK: "Use With Caution", ERROR: "Try Again",
	};

	return (
		<div className="h-dvh bg-brutal-black text-brutal-white flex flex-col relative overflow-hidden">
			{/* Header */}
			<div className="absolute top-0 w-full z-50 flex items-center justify-between bg-brutal-black/80 backdrop-blur-sm brutal-border-b p-3 sm:p-4">
				<button onClick={() => navigate(-1)} className="text-brutal-white flex items-center gap-2 active:opacity-60 cursor-pointer">
					<span className="font-black text-sm">&larr;</span>
					<span className="text-xs font-black tracking-widest uppercase">Back</span>
				</button>
				<div className="text-center">
					<Badge variant="info" className="text-[9px]">In-Store</Badge>
					<p className="text-brutal-white text-xs font-bold mt-0.5">{hairType} hair</p>
				</div>
				<button
					onClick={() => setFacingMode((f) => (f === "environment" ? "user" : "environment"))}
					className="text-brutal-white/60 hover:text-brutal-white text-xs font-black uppercase tracking-wider cursor-pointer"
				>
					Flip
				</button>
			</div>

			{/* Camera */}
			<div className="absolute inset-0 flex items-center justify-center">
				<video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover rotate-y-180" />
				<canvas ref={canvasRef} className="hidden" />

				{/* Reticle */}
				{!scanning && !result && (
					<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
						<div className="relative border-2 border-brutal-sky/40" style={{ width: "70%", height: "65%" }}>
							<div className="absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 border-brutal-sky" />
							<div className="absolute top-0 right-0 w-6 h-6 border-t-3 border-r-3 border-brutal-sky" />
							<div className="absolute bottom-0 left-0 w-6 h-6 border-b-3 border-l-3 border-brutal-sky" />
							<div className="absolute bottom-0 right-0 w-6 h-6 border-b-3 border-r-3 border-brutal-sky" />
						</div>
						<p className="absolute bottom-6 text-brutal-sky text-xs font-black tracking-widest uppercase animate-pulse">
							Point at product label
						</p>
					</div>
				)}

				{/* Scanning */}
				{scanning && (
					<div className="absolute inset-0 bg-brutal-black/60 flex flex-col items-center justify-center gap-3">
						<div className="w-12 h-12 border-4 border-brutal-sky/30 border-t-brutal-sky animate-spin" />
						<p className="text-brutal-sky text-sm font-black tracking-wider">Kera is reading the label...</p>
					</div>
				)}

				{/* Result overlay */}
				{result && !scanning && (
					<div className="absolute inset-x-0 bottom-0 bg-brutal-white text-brutal-black p-4 brutal-border-t z-20">
						<div className="flex items-center gap-3 mb-2">
							<Badge variant={verdictBadge[result.verdict] || "default"}>
								{verdictLabel[result.verdict] || "Unknown"}
							</Badge>
							{result.confidence && <span className="ml-auto text-sm font-black">{result.confidence}%</span>}
						</div>
						{(result.products_detected?.length ?? 0) > 0 && (
							<p className="text-xs text-brutal-black/50 mb-1">{result.products_detected?.join(", ")}</p>
						)}
						<p className="text-sm leading-relaxed">{result.reason}</p>
						{result.recommendation && <p className="mt-2 text-xs text-brutal-black/50">{result.recommendation}</p>}
						{(result.key_ingredients_found?.length ?? 0) > 0 && (
							<div className="flex flex-wrap gap-1 mt-2">
								{result.key_ingredients_found?.map((ing, i) => <Badge key={i} variant="success" className="text-[10px]">{ing}</Badge>)}
							</div>
						)}
						{(result.ingredients_to_avoid_found?.length ?? 0) > 0 && (
							<div className="flex flex-wrap gap-1 mt-1">
								{result.ingredients_to_avoid_found?.map((ing, i) => <Badge key={i} variant="danger" className="text-[10px]">{ing}</Badge>)}
							</div>
						)}
						<Button variant="secondary" size="sm" className="w-full mt-3" onClick={() => setResult(null)}>Scan Another Product</Button>
					</div>
				)}
			</div>

			{/* Bottom controls */}
			<div className="bg-brutal-black brutal-border-t absolute bottom-0 inset-x-0 z-30 p-4 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
				<Button className="w-full" size="lg" onClick={doScan} disabled={scanning || !cameraOn}>
					{scanning ? "Analysing..." : "Scan This Product"}
				</Button>
			</div>

			{/* Session history */}
			{history.length > 0 && (
				<div className="absolute bottom-24 left-3 right-3 z-20">
					<Card variant="flat" padding="sm" className="bg-brutal-black/90 text-brutal-white border-brutal-white/20">
						<p className="text-[10px] font-black uppercase tracking-widest text-brutal-white/40 mb-2">This Session</p>
						<div className="space-y-1.5">
							{history.map((h, i) => (
								<div key={i} className="flex items-center gap-2">
									<Badge variant={verdictBadge[h.verdict] || "default"} className="text-[9px]">
										{h.verdict}
									</Badge>
									<p className="text-brutal-white/60 text-xs flex-1 truncate">{h.products_detected?.[0] || "Product"}</p>
									<span className="text-[9px] text-brutal-white/30">{h.timestamp}</span>
								</div>
							))}
						</div>
					</Card>
				</div>
			)}
		</div>
	);
}
