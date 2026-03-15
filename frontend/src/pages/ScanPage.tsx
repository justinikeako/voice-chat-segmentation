import { useEffect, useRef, useState, useCallback } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
	ImageSegmenter,
	FilesetResolver,
	ImageSegmenterResult,
} from "@mediapipe/tasks-vision";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import type { MicVAD } from "@ricky0123/vad-web";
import vad from "@ricky0123/vad-web";
import { getApiUrl, cn } from "../lib/utils";
import { Badge } from "../components/ui/badge";
import { DemoTip } from "../components/ui/demo-tip";

let _cachedToken: { token: string; region: string } | null = null;
let _tokenExpiry = 0;
const fetchSpeechToken = async () => {
	const now = Date.now();
	if (_cachedToken && now < _tokenExpiry) return _cachedToken;
	const res = await fetch(`${getApiUrl()}/api/analyse/speech-token`);
	if (!res.ok) throw new Error(`Speech token fetch failed: ${res.status}`);
	const data = await res.json();
	_cachedToken = data;
	_tokenExpiry = now + 9 * 60 * 1000;
	return data;
};

export default function ScanPage() {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const animFrameRef = useRef<number | null>(null);
	const analysisIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const segmentationRef = useRef<ImageSegmenter | null>(null);
	const chatHistoryRef = useRef<{ role: "user" | "assistant" | string; content: string }[]>([]);
	const lastProcessingTime = useRef(0);
	const navigate = useNavigate();

	const recognizerRef = useRef<SpeechSDK.SpeechRecognizer | null>(null);
	const vadRef = useRef<MicVAD | null>(null);
	const isSpeakingRef = useRef(false);
	const isSendingRef = useRef(false);
	const micEnabledRef = useRef(false);
	const componentMountedRef = useRef(true);
	const currentAudioRef = useRef<HTMLAudioElement | null>(null);
	const sendToKeraRef = useRef<((text: string) => Promise<void>) | null>(null);
	const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const showSegRef = useRef(true);

	const [error, setError] = useState("");
	const [isAnalysing, setIsAnalysing] = useState(false);
	const [cameraActive, setCameraActive] = useState(false);
	const [mediaPipeReady, setMediaPipeReady] = useState(false);
	const [liveHairType, setLiveHairType] = useState<"Straight" | "Wavy" | "Curly" | "Coily" | null>(null);
	const [liveConfidence, setLiveConfidence] = useState<number | null>(null);
	const [, setScanPhase] = useState("idle");
	const [countdown, setCountdown] = useState<number | null>(null);
	const [showSegmentation, setShowSegmentation] = useState(true);
	const [voiceText, setVoiceText] = useState("");
	const [micEnabled, setMicEnabled] = useState(false);
	const [voiceState, setVoiceState] = useState("idle");

	useEffect(() => { showSegRef.current = showSegmentation; }, [showSegmentation]);
	useEffect(() => { micEnabledRef.current = micEnabled; }, [micEnabled]);

	const interruptKera = useCallback(() => {
		if (currentAudioRef.current) {
			currentAudioRef.current.pause();
			currentAudioRef.current.currentTime = 0;
			currentAudioRef.current = null;
		}
		isSpeakingRef.current = false;
		if (micEnabledRef.current && componentMountedRef.current) {
			setTimeout(() => {
				if (micEnabledRef.current && componentMountedRef.current) {
					try {
						recognizerRef.current?.startContinuousRecognitionAsync(
							() => setVoiceState("listening"),
							() => {},
						);
					} catch { /* ignore */ }
				}
			}, 150);
		}
	}, []);

	const stopRecognizer = useCallback(() => {
		try { recognizerRef.current?.stopContinuousRecognitionAsync(() => {}, () => {}); } catch { /* ignore */ }
	}, []);

	const startRecognizer = useCallback(() => {
		if (!componentMountedRef.current || !recognizerRef.current) return;
		try {
			recognizerRef.current.startContinuousRecognitionAsync(
				() => setVoiceState("listening"),
				(err) => console.warn("[Kera STT] start error:", err),
			);
		} catch (e) { console.warn("[Kera STT] startRecognizer:", e); }
	}, []);

	const drawHairOverlay = useCallback((result: ImageSegmenterResult) => {
		const overlay = overlayCanvasRef.current;
		if (!overlay) return;
		const ctx = overlay.getContext("2d");
		if (!ctx) return;
		const video = videoRef.current;
		if (!video) return;
		overlay.width = video.videoWidth || 640;
		overlay.height = video.videoHeight || 480;
		ctx.clearRect(0, 0, overlay.width, overlay.height);
		if (result.categoryMask && showSegRef.current) {
			const mask = result.categoryMask;
			const maskData = mask.getAsUint8Array();
			const imageData = ctx.createImageData(mask.width, mask.height);
			for (let i = 0; i < maskData.length; i++) {
				if (maskData[i] === 1) {
					imageData.data[i * 4] = 255;
					imageData.data[i * 4 + 1] = 215;
					imageData.data[i * 4 + 2] = 0;
					imageData.data[i * 4 + 3] = 80;
				} else {
					imageData.data[i * 4 + 3] = 0;
				}
			}
			const tmp = document.createElement("canvas");
			tmp.width = mask.width;
			tmp.height = mask.height;
			tmp.getContext("2d")!.putImageData(imageData, 0, 0);
			ctx.globalCompositeOperation = "source-over";
			ctx.drawImage(tmp, 0, 0, overlay.width, overlay.height);
		}
	}, []);

	const initMediaPipe = useCallback(async () => {
		try {
			const vision = await FilesetResolver.forVisionTasks(
				"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm",
			);
			segmentationRef.current = await ImageSegmenter.createFromOptions(vision, {
				baseOptions: {
					modelAssetPath:
						"https://storage.googleapis.com/mediapipe-models/image_segmenter/hair_segmenter/float32/latest/hair_segmenter.tflite",
					delegate: "GPU",
				},
				runningMode: "VIDEO",
				outputCategoryMask: true,
				outputConfidenceMasks: false,
			});
			setMediaPipeReady(true);
		} catch (e) { console.warn("[Kera AI] MediaPipe init failed:", e); }
	}, []);

	useEffect(() => {
		componentMountedRef.current = true;
		(async () => {
			try {
				if (!navigator.mediaDevices?.getUserMedia) { setError("Camera not supported. Use HTTPS."); return; }
				const mediaStream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
				});
				streamRef.current = mediaStream;
				if (videoRef.current) {
					videoRef.current.srcObject = mediaStream;
					videoRef.current.onloadedmetadata = () => { setCameraActive(true); initMediaPipe(); startLiveAnalysis(); };
				}
			} catch { setError("Camera access denied. Please upload a photo instead."); }
		})();
		(async () => {
			try {
				const myvad = await vad.MicVAD.new({
					onSpeechStart: () => { if (!micEnabledRef.current) return; if (isSpeakingRef.current) interruptKera(); setVoiceState("listening"); setVoiceText(""); },
					onSpeechEnd: () => { if (!micEnabledRef.current) return; },
					positiveSpeechThreshold: 0.7, negativeSpeechThreshold: 0.35, minSpeechMs: 100, preSpeechPadMs: 5,
					onnxWASMBasePath: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
					baseAssetPath: "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.29/dist/",
				});
				vadRef.current = myvad;
			} catch (e) { console.warn("[Kera VAD] init failed:", e); }
		})();
		return () => {
			componentMountedRef.current = false;
			micEnabledRef.current = false;
			streamRef.current?.getTracks().forEach((t) => t.stop());
			if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
			if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
			try { const rec = recognizerRef.current; if (rec) rec.stopContinuousRecognitionAsync(() => { try { rec.close(); } catch {} }, () => { try { rec.close(); } catch {} }); } catch {}
			try { vadRef.current?.destroy(); } catch {}
			interruptKera();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const playAzureTTS = async (text: string) => {
		try {
			stopRecognizer();
			isSpeakingRef.current = true;
			setVoiceState("speaking");
			setVoiceText("");
			const { token: ttsToken, region: ttsRegion } = await fetchSpeechToken();
			const cleanText = text.replace(/\*/g, "").replace(/[<>&'"]/g, "");
			const response = await fetch(
				`https://${ttsRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
				{
					method: "POST",
					headers: { Authorization: `Bearer ${ttsToken}`, "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3" },
					body: `<speak version='1.0' xml:lang='en-US'><voice xml:lang='en-US' xml:gender='Female' name='en-US-JennyNeural'><prosody rate="+10%">${cleanText}</prosody></voice></speak>`,
				},
			);
			if (response.ok) {
				const audio = new Audio(URL.createObjectURL(await response.blob()));
				currentAudioRef.current = audio;
				audio.onended = () => { URL.revokeObjectURL(audio.src); currentAudioRef.current = null; isSpeakingRef.current = false; setVoiceText(""); if (micEnabledRef.current && componentMountedRef.current) { setVoiceState("listening"); startRecognizer(); } else { setVoiceState("idle"); } };
				audio.onerror = () => { currentAudioRef.current = null; isSpeakingRef.current = false; setVoiceState(micEnabledRef.current ? "listening" : "idle"); if (micEnabledRef.current) startRecognizer(); };
				try { await audio.play(); } catch { URL.revokeObjectURL(audio.src); currentAudioRef.current = null; isSpeakingRef.current = false; setVoiceState(micEnabledRef.current ? "listening" : "idle"); if (micEnabledRef.current) startRecognizer(); return; }
			} else { isSpeakingRef.current = false; setVoiceState(micEnabledRef.current ? "listening" : "idle"); if (micEnabledRef.current) startRecognizer(); }
		} catch (e) { console.error("[Azure TTS]", e); isSpeakingRef.current = false; setVoiceState(micEnabledRef.current ? "listening" : "idle"); if (micEnabledRef.current) startRecognizer(); }
	};

	const sendToKera = async (text: string) => {
		if (isSendingRef.current || !text || text.trim().length < 2) return;
		isSendingRef.current = true;
		setVoiceText(text);
		try {
			const video = videoRef.current;
			if (!video) return;
			const mc = document.createElement("canvas");
			mc.width = video.videoWidth; mc.height = video.videoHeight;
			const mctx = mc.getContext("2d");
			if (!mctx) return;
			mctx.drawImage(video, 0, 0, mc.width, mc.height);
			if (drawingCanvasRef.current) mctx.drawImage(drawingCanvasRef.current, 0, 0, mc.width, mc.height);
			const res = await axios.post(`${getApiUrl()}/api/analyse/chat/`, {
				system: "You are Kera AI. The user has provided an image of their hair with their finger pointing or painting at a specific spot. Answer their specific question regarding the segment they painted or pointed to.",
				messages: [{ role: "user", content: text }],
				image: mc.toDataURL("image/jpeg", 0.8),
			}, { timeout: 15000 });
			if (res.data?.reply) {
				chatHistoryRef.current = [...chatHistoryRef.current, { role: "user", content: text }, { role: "assistant", content: res.data.reply }].slice(-20);
				await playAzureTTS(res.data.reply);
			}
		} catch (e) { console.error("[Kera AI] Chat error:", e); if (micEnabledRef.current && componentMountedRef.current) startRecognizer(); } finally { isSendingRef.current = false; }
	};
	sendToKeraRef.current = sendToKera;

	const buildAndStartRecognizer = async () => {
		if (recognizerRef.current) {
			const oldRec = recognizerRef.current;
			recognizerRef.current = null;
			try { oldRec.stopContinuousRecognitionAsync(() => { try { oldRec.close(); } catch {} }, () => { try { oldRec.close(); } catch {} }); } catch {}
		}
		try {
			const { token, region } = await fetchSpeechToken();
			const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(token, region);
			speechConfig.speechRecognitionLanguage = "en-US";
			const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
			const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
			recognizer.recognizing = (_, e) => { if (!micEnabledRef.current) return; if (e.result.text) setVoiceText(e.result.text); };
			recognizer.recognized = (_, e) => { if (!micEnabledRef.current) return; if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) { const text = e.result.text.trim(); if (text.length > 1 && !isSendingRef.current) sendToKeraRef.current?.(text); } };
			recognizer.canceled = (_, e) => { console.warn("[Kera STT] canceled:", e.errorDetails); if (micEnabledRef.current && componentMountedRef.current) { setTimeout(() => { if (micEnabledRef.current && componentMountedRef.current) buildAndStartRecognizer(); }, 2000); } };
			recognizerRef.current = recognizer;
			recognizer.startContinuousRecognitionAsync(() => setVoiceState("listening"), (err) => console.warn("[Kera STT] start error:", err));
			fetchSpeechToken().catch(() => {});
		} catch (e) { console.error("[Kera STT] buildAndStartRecognizer failed:", e); setVoiceState("idle"); }
	};

	const toggleMic = () => {
		try { const AudioCtx = window.AudioContext || (window as any).webkitAudioContext; new AudioCtx().resume(); } catch {}
		try { const s = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="); s.volume = 0; s.play().then(() => s.pause()).catch(() => {}); } catch {}
		if (micEnabled) {
			micEnabledRef.current = false; setMicEnabled(false); setVoiceState("idle"); setVoiceText(""); interruptKera(); stopRecognizer();
			try { vadRef.current?.pause(); } catch {}
		} else {
			micEnabledRef.current = true; setMicEnabled(true); setVoiceText(""); setVoiceState("listening"); buildAndStartRecognizer();
			try { vadRef.current?.start(); } catch {}
		}
	};

	const setupDrawingCanvas = () => {
		const canvas = drawingCanvasRef.current;
		if (!canvas || !videoRef.current) return;
		canvas.width = videoRef.current.clientWidth;
		canvas.height = videoRef.current.clientHeight;
	};
	useEffect(() => { window.addEventListener("resize", setupDrawingCanvas); return () => window.removeEventListener("resize", setupDrawingCanvas); }, []);

	useEffect(() => {
		if (!mediaPipeReady || !cameraActive) return;
		let running = true;
		const loop = () => {
			if (!running) return;
			const now = performance.now();
			if (videoRef.current && !videoRef.current.paused && now - lastProcessingTime.current > 150) {
				lastProcessingTime.current = now;
				try {
					if (segmentationRef.current && showSegRef.current) { segmentationRef.current.segmentForVideo(videoRef.current, now, drawHairOverlay); }
					else if (!showSegRef.current && overlayCanvasRef.current) { const ov = overlayCanvasRef.current; ov.width = videoRef.current.videoWidth || 640; ov.height = videoRef.current.videoHeight || 480; ov.getContext("2d")!.clearRect(0, 0, ov.width, ov.height); }
				} catch {}
			}
			animFrameRef.current = requestAnimationFrame(loop);
		};
		loop();
		return () => { running = false; };
	}, [mediaPipeReady, cameraActive, drawHairOverlay]);

	const startLiveAnalysis = () => {
		analysisIntervalRef.current = setInterval(async () => {
			if (!videoRef.current || !canvasRef.current || isAnalysing) return;
			const v = videoRef.current, c = canvasRef.current;
			c.width = v.videoWidth; c.height = v.videoHeight;
			c.getContext("2d")!.drawImage(v, 0, 0);
			c.toBlob(async (blob) => {
				if (!blob) return;
				const fd = new FormData();
				fd.append("image", new File([blob], "live.jpg", { type: "image/jpeg" }));
				fd.append("live_mode", "true");
				try {
					const res = await axios.post(`${getApiUrl()}/api/analyse/live`, fd, { headers: { "Content-Type": "multipart/form-data" }, timeout: 8000 });
					if (res.data?.hair_type) { setLiveHairType(res.data.hair_type); setLiveConfidence(res.data.confidence); }
				} catch {}
			}, "image/jpeg", 0.6);
		}, 4000);
	};

	const processImageAndSend = async (blob: Blob) => {
		setIsAnalysing(true); setScanPhase("analysing"); setError("");
		if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
		const fd = new FormData();
		fd.append("image", new File([blob], "scan.jpg", { type: "image/jpeg" }));
		fd.append("user_id", localStorage.getItem("kera_user_id") || "1");
		try {
			const response = await axios.post(`${getApiUrl()}/api/analyse/`, fd, { headers: { "Content-Type": "multipart/form-data" } });
			navigate("/results", { state: { data: response.data.data, chatHistory: chatHistoryRef.current } });
		} catch { setError("Analysis failed. Check the backend server and try again."); setIsAnalysing(false); setScanPhase("idle"); startLiveAnalysis(); }
	};

	const handleCapture = () => {
		if (!videoRef.current || !canvasRef.current || isAnalysing) return;
		setScanPhase("captured");
		let count = 3;
		setCountdown(count);
		const timer = setInterval(() => {
			count--;
			if (count <= 0) {
				clearInterval(timer); setCountdown(null);
				const v = videoRef.current, c = canvasRef.current;
				if (!c || !v) return;
				c.width = v.videoWidth; c.height = v.videoHeight;
				c.getContext("2d")!.drawImage(v, 0, 0);
				c.toBlob((b) => { if (b) processImageAndSend(b); }, "image/jpeg", 0.92);
			} else setCountdown(count);
		}, 1000);
	};

	const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.[0]) processImageAndSend(e.target.files[0]);
	};

	const hairTypeBadge = {
		Straight: "info" as const,
		Wavy: "success" as const,
		Curly: "warning" as const,
		Coily: "danger" as const,
	};

	const micState = !micEnabled ? "idle" : voiceState;

	return (
		<div className="h-dvh bg-brutal-black text-brutal-white flex flex-col relative overflow-hidden">
			{/* Header */}
			<div className="absolute top-0 w-full z-50 flex justify-between items-center bg-brutal-black/80 backdrop-blur-sm brutal-border-b p-3 sm:p-4">
				<button
					onClick={() => navigate("/dashboard")}
					className="text-brutal-white flex items-center gap-2 active:opacity-60 cursor-pointer"
				>
					<span className="font-black text-sm">&larr;</span>
					<span className="text-xs font-black tracking-widest uppercase">Back</span>
				</button>

				<span className="text-xs font-black tracking-[0.25em] text-brutal-yellow uppercase">
					Scan
				</span>

				<div className="flex items-center gap-2">
					<button
						onClick={toggleMic}
						className={cn(
							"w-8 h-8 flex items-center justify-center brutal-border-thin transition-all cursor-pointer",
							micState === "idle"
								? "bg-brutal-black text-brutal-white/50 hover:text-brutal-white"
								: micState === "listening"
									? "bg-brutal-coral text-brutal-black animate-pulse"
									: "bg-brutal-yellow text-brutal-black animate-pulse"
						)}
						title={
							micState === "idle"
								? "Tap to talk to Kera"
								: micState === "listening"
									? "Listening — tap to mute"
									: "Kera speaking — tap to interrupt"
						}
					>
						<span className="text-xs font-black">
							{micState === "idle" ? "◇" : micState === "speaking" ? "■" : "●"}
						</span>
					</button>

					<button
						onClick={() => setShowSegmentation((s) => !s)}
						className={cn(
							"text-[9px] font-black uppercase tracking-widest px-2 py-1 brutal-border-thin transition-colors cursor-pointer",
							showSegmentation
								? "bg-brutal-lime text-brutal-black"
								: "bg-brutal-black text-brutal-white/40"
						)}
					>
						Seg
					</button>

					{mediaPipeReady && (
						<Badge variant="success" className="text-[9px]">
							Live
						</Badge>
					)}
				</div>
			</div>

			{/* Viewfinder */}
			<div className="bg-black flex items-center justify-center overflow-hidden absolute inset-0">
				<video
					ref={videoRef}
					autoPlay playsInline muted
					className={cn(
						"w-full h-full rotate-y-180 object-cover transition-all duration-700",
						!cameraActive && "hidden",
						isAnalysing && "opacity-20 blur-sm scale-105"
					)}
				/>

				{!cameraActive && (
					<div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-brutal-black p-8 text-center">
						<span className="text-5xl mb-4 opacity-40">◎</span>
						<p className="text-sm font-black uppercase tracking-wider text-brutal-white/40">
							{error || "Initialising camera..."}
						</p>
					</div>
				)}

				<canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none rotate-y-180 z-10 opacity-80" />

				{/* Voice transcript */}
				{micEnabled && voiceText && (
					<div className="absolute top-20 left-3 right-3 z-40">
						<div className="bg-brutal-black brutal-border brutal-shadow-sm p-3">
							<p className="text-[10px] text-brutal-yellow font-black uppercase tracking-widest mb-1 flex items-center gap-1.5">
								<span className={cn("w-1.5 h-1.5 bg-brutal-yellow", voiceState === "listening" && "animate-pulse")} />
								You
							</p>
							<p className="text-brutal-white text-sm font-medium leading-snug">{voiceText}</p>
						</div>
					</div>
				)}
				{micEnabled && !voiceText && voiceState === "listening" && (
					<div className="absolute top-20 left-3 right-3 z-40">
						<div className="bg-brutal-black/80 brutal-border p-3">
							<p className="text-[10px] text-brutal-yellow font-black uppercase tracking-widest flex items-center gap-1.5">
								<span className="w-1.5 h-1.5 bg-brutal-yellow animate-pulse" />
								Listening...
							</p>
						</div>
					</div>
				)}

				{/* Frame guides */}
				{!isAnalysing && cameraActive && (
					<div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center" style={{ zIndex: 12 }}>
						<div className="w-56 h-72 relative border-2 border-brutal-yellow/40">
							<div className="absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 border-brutal-yellow" />
							<div className="absolute top-0 right-0 w-6 h-6 border-t-3 border-r-3 border-brutal-yellow" />
							<div className="absolute bottom-0 left-0 w-6 h-6 border-b-3 border-l-3 border-brutal-yellow" />
							<div className="absolute bottom-0 right-0 w-6 h-6 border-b-3 border-r-3 border-brutal-yellow" />
							<div className="absolute inset-0 overflow-hidden">
								<div className="absolute w-full h-0.5 bg-brutal-yellow/60" style={{ animation: "scanline 2.5s linear infinite", top: 0 }} />
							</div>
						</div>
						<p className="mt-4 text-brutal-white/70 text-xs font-black tracking-widest uppercase bg-brutal-black/80 px-4 py-2 brutal-border-thin">
							Align hair to frame
						</p>
					</div>
				)}

				{/* Live hair type badge */}
				{liveHairType && !isAnalysing && (
					<div className="absolute top-16 left-1/2 -translate-x-1/2 z-30">
						<Badge variant={hairTypeBadge[liveHairType]} className="brutal-shadow-sm text-xs">
							{liveHairType} &middot; {Math.round((liveConfidence || 0) * 100)}%
						</Badge>
					</div>
				)}

				{/* Countdown */}
				{countdown !== null && (
					<div className="absolute inset-0 z-40 flex items-center justify-center bg-brutal-black/60">
						<div className="text-9xl font-black text-brutal-yellow" style={{ animation: "countPulse 1s ease-out" }}>
							{countdown}
						</div>
					</div>
				)}

				{/* Analysing overlay */}
				{isAnalysing && (
					<div className="absolute inset-0 z-40 flex flex-col items-center justify-center">
						<div className="relative mb-8">
							<div className="w-20 h-20 border-4 border-brutal-white/10 border-t-brutal-yellow animate-spin" />
						</div>
						<h2 className="text-lg font-black tracking-widest text-brutal-white uppercase mb-1">Analysing</h2>
						<p className="text-brutal-yellow text-xs font-black tracking-widest animate-pulse uppercase">
							CNN &middot; GPT-5 &middot; Multi-Agent
						</p>
					</div>
				)}
				<video className="hidden" onCanPlay={setupDrawingCanvas} />
			</div>

			<canvas ref={canvasRef} className="hidden" />

			{/* Bottom Controls */}
			<div className="bg-brutal-black brutal-border-t absolute bottom-0 inset-x-0 z-30 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] px-5">
				{error && !isAnalysing && (
					<p className="text-brutal-coral text-xs font-black text-center mb-3 uppercase">{error}</p>
				)}
				<div className="flex items-center justify-between max-w-xs mx-auto">
					<button
						onClick={() => fileInputRef.current?.click()}
						disabled={isAnalysing}
						className="flex flex-col items-center gap-1 text-brutal-white/40 hover:text-brutal-white transition-colors disabled:opacity-30 cursor-pointer"
					>
						<div className="w-11 h-11 brutal-border-thin bg-brutal-black flex items-center justify-center">
							<span className="text-lg">⊞</span>
						</div>
						<span className="text-[9px] font-black tracking-widest uppercase">Upload</span>
					</button>

					<button
						onClick={handleCapture}
						disabled={isAnalysing || !cameraActive}
						className="relative w-18 h-18 disabled:opacity-30 active:scale-95 transition-transform cursor-pointer"
					>
						<div className="absolute inset-0 border-3 border-brutal-yellow" />
						<div className="absolute inset-2 bg-brutal-white" />
					</button>

					<div className="flex flex-col items-center gap-1 text-brutal-white/20">
						<div className="w-11 h-11 brutal-border-thin bg-brutal-black flex items-center justify-center">
							<span className="text-lg">⚡</span>
						</div>
						<span className="text-[9px] font-black tracking-widest uppercase">Auto</span>
					</div>
				</div>

				<input type="file" accept="image/*" capture="user" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />

				<div className="mt-3">
					<DemoTip dark />
				</div>
			</div>

			<style>{`
				@keyframes scanline { 0%{top:0;opacity:0} 10%{opacity:.6} 90%{opacity:.6} 100%{top:100%;opacity:0} }
				@keyframes countPulse { 0%{transform:scale(1.4);opacity:0} 100%{transform:scale(1);opacity:1} }
			`}</style>
		</div>
	);
}
