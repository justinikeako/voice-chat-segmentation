// Description: ScanPage with Azure Speech SDK (STT) + Silero VAD (barge-in detection)
//
// SETUP — run once in your frontend directory:
//   npm install microsoft-cognitiveservices-speech-sdk
//
// Also add these TWO script tags to public/index.html <head>:
//   <script src="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/ort.wasm.min.js"></script>
//   <script src="https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.29/dist/bundle.min.js"></script>
//
// Add to your .env:
//   REACT_APP_AZURE_SPEECH_KEY=your_key_here
//   REACT_APP_AZURE_SPEECH_REGION=eastus
//
// HOW IT WORKS:
//   • Silero VAD runs on mic audio — fires onSpeechStart ~100ms after you begin speaking
//   • onSpeechStart → immediately cuts Kera's TTS (barge-in, zero delay)
//   • Azure Speech SDK continuous recognizer transcribes speech reliably on mobile
//   • 'recognized' event (Azure's confirmed transcript) → sends to Kera API
//   • No Web Speech API — no stuck "Listening...", no mobile isFinal bugs

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

const getApiUrl = () => {
	const saved = localStorage.getItem("VITE_API_URL");
	if (saved) return saved;
	const env = process.env.REACT_APP_API_URL;
	if (env) return env;
	if (
		window.location.hostname !== "localhost" &&
		window.location.hostname !== "127.0.0.1"
	) {
		return window.location.origin;
	}
	return "http://127.0.0.1:5000";
};

// Token cache — tokens last 10 min, cache avoids refetch on every TTS call (~200ms saved)
let _cachedToken: { token: string; region: string } | null = null;
let _tokenExpiry = 0;
const fetchSpeechToken = async () => {
	const now = Date.now();
	if (_cachedToken && now < _tokenExpiry) return _cachedToken;
	const res = await fetch(`${getApiUrl()}/api/analyse/speech-token`);
	if (!res.ok) throw new Error(`Speech token fetch failed: ${res.status}`);
	const data = await res.json(); // { token, region }
	_cachedToken = data;
	_tokenExpiry = now + 9 * 60 * 1000; // cache for 9 min (tokens last 10)
	return data;
};

export default function ScanPage() {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const animFrameRef = useRef<number | null>(null);
	const analysisIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
		null,
	);
	const segmentationRef = useRef<ImageSegmenter | null>(null);
	const chatHistoryRef = useRef<
		{ role: "user" | "assistant" | string; content: string }[]
	>([]); // stores conversation for ResultsPage
	const lastProcessingTime = useRef(0);
	const navigate = useNavigate();

	// Azure Speech + VAD refs
	const recognizerRef = useRef<SpeechSDK.SpeechRecognizer | null>(null); // SpeechSDK.SpeechRecognizer
	const vadRef = useRef<MicVAD | null>(null); // Silero MicVAD

	// TTS / state refs
	const isSpeakingRef = useRef(false);
	const isSendingRef = useRef(false);
	const micEnabledRef = useRef(false);
	const componentMountedRef = useRef(true);
	const currentAudioRef = useRef<HTMLAudioElement | null>(null);
	const sendToKeraRef = useRef<((text: string) => Promise<void>) | null>(null); // always-current sendToKera for recognizer closure

	// Drawing refs
	const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const showSegRef = useRef(true);

	// UI State
	const [error, setError] = useState("");
	const [isAnalysing, setIsAnalysing] = useState(false);
	const [cameraActive, setCameraActive] = useState(false);
	const [mediaPipeReady, setMediaPipeReady] = useState(false);
	const [liveHairType, setLiveHairType] = useState<
		"Straight" | "Wavy" | "Curly" | "Coily" | null
	>(null);
	const [liveConfidence, setLiveConfidence] = useState<number | null>(null);
	const [, setScanPhase] = useState("idle");
	const [countdown, setCountdown] = useState<number | null>(null);
	const [showSegmentation, setShowSegmentation] = useState(true);
	const [voiceText, setVoiceText] = useState("");
	const [micEnabled, setMicEnabled] = useState(false);
	// 'idle' | 'listening' | 'speaking'
	const [voiceState, setVoiceState] = useState("idle");

	useEffect(() => {
		showSegRef.current = showSegmentation;
	}, [showSegmentation]);
	useEffect(() => {
		micEnabledRef.current = micEnabled;
	}, [micEnabled]);

	// ── Interrupt Kera TTS + restart STT so we're ready for the new question ──
	const interruptKera = useCallback(() => {
		if (currentAudioRef.current) {
			currentAudioRef.current.pause();
			currentAudioRef.current.currentTime = 0;
			currentAudioRef.current = null;
		}
		isSpeakingRef.current = false;
		// Recognizer was stopped when TTS started — restart it so Azure can hear the question
		if (micEnabledRef.current && componentMountedRef.current) {
			// Small delay so audio echo clears before mic opens
			setTimeout(() => {
				if (micEnabledRef.current && componentMountedRef.current) {
					try {
						recognizerRef.current?.startContinuousRecognitionAsync(
							() => setVoiceState("listening"),
							() => {
								/* ignore */
							}, // silent fail — canceled handler will retry
						);
					} catch {
						/* ignore */
					}
				}
			}, 150);
		}
	}, []);

	// ── Azure Recognizer helpers ──────────────────────────────────────────────
	const stopRecognizer = useCallback(() => {
		try {
			recognizerRef.current?.stopContinuousRecognitionAsync(
				() => {
					/* ignore */
				},
				() => {
					/* ignore */
				},
			);
		} catch {
			/* ignore */
		}
	}, []);

	// startRecognizer restarts the existing recognizer (used after TTS ends).
	// If no recognizer exists yet (e.g. token expired), buildAndStartRecognizer is called instead.
	const startRecognizer = useCallback(() => {
		if (!componentMountedRef.current) return;
		if (!recognizerRef.current) {
			// No recognizer — need a fresh token, handled by buildAndStartRecognizer
			// (will be defined below — safe because it's only called after mount)
			return;
		}
		try {
			recognizerRef.current.startContinuousRecognitionAsync(
				() => setVoiceState("listening"),
				(err) => console.warn("[Kera STT] start error:", err),
			);
		} catch (e) {
			console.warn("[Kera STT] startRecognizer:", e);
		}
	}, []);

	// ── MediaPipe Hair Overlay ────────────────────────────────────────────────
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
					imageData.data[i * 4] = 0;
					imageData.data[i * 4 + 1] = 0;
					imageData.data[i * 4 + 2] = 255;
					imageData.data[i * 4 + 3] = 120;
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
		} catch (e) {
			console.warn("[Kera AI] MediaPipe init failed:", e);
		}
	}, []);

	// ── Main init: Camera + Azure STT + Silero VAD ───────────────────────────
	useEffect(() => {
		componentMountedRef.current = true;

		// 1. Camera
		(async () => {
			try {
				if (!navigator.mediaDevices?.getUserMedia) {
					setError("Camera not supported. Use HTTPS.");
					return;
				}
				const mediaStream = await navigator.mediaDevices.getUserMedia({
					video: {
						facingMode: "user",
						width: { ideal: 1280 },
						height: { ideal: 720 },
					},
				});
				streamRef.current = mediaStream;
				if (videoRef.current) {
					videoRef.current.srcObject = mediaStream;
					videoRef.current.onloadedmetadata = () => {
						setCameraActive(true);
						initMediaPipe();
						startLiveAnalysis();
					};
				}
			} catch {
				setError("Camera access denied. Please upload a photo instead.");
			}
		})();

		// 2. Azure Speech SDK — recognizer is created on demand (when mic is toggled on)
		//    so we always have a fresh token. Stored in recognizerRef.
		//    buildRecognizer() is called from toggleMic (see below).

		// 3. Silero VAD (loaded from public/index.html CDN script tags)
		(async () => {
			try {
				const myvad = await vad.MicVAD.new({
					onSpeechStart: () => {
						// ── BARGE-IN: fires ~100ms after first syllable ──
						if (!micEnabledRef.current) return;
						if (isSpeakingRef.current) interruptKera(); // cut Kera off instantly
						setVoiceState("listening");
						setVoiceText("");
					},
					onSpeechEnd: () => {
						// Azure STT 'recognized' will fire shortly after this
						if (!micEnabledRef.current) return;
						// Keep showing "listening" — recognized event will trigger send
					},
					// Tune for noisy environments: raise positiveSpeechThreshold to reduce false triggers
					positiveSpeechThreshold: 0.7,
					negativeSpeechThreshold: 0.35,
					minSpeechMs: 100, // ignore pops < 100ms
					preSpeechPadMs: 5,
					onnxWASMBasePath:
						"https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
					baseAssetPath:
						"https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.29/dist/",
				});
				vadRef.current = myvad;
				console.log("[Kera VAD] Silero VAD ready");
			} catch (e) {
				console.warn("[Kera VAD] init failed:", e);
			}
		})();

		return () => {
			componentMountedRef.current = false;
			micEnabledRef.current = false;
			streamRef.current?.getTracks().forEach((t) => t.stop());
			if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
			if (analysisIntervalRef.current)
				clearInterval(analysisIntervalRef.current);
			try {
				const rec = recognizerRef.current;
				if (rec)
					rec.stopContinuousRecognitionAsync(
						() => {
							try {
								rec.close();
							} catch {
								/* ignore */
							}
						},
						() => {
							try {
								rec.close();
							} catch {
								/* ignore */
							}
						},
					);
			} catch {
				/* ignore */
			}
			try {
				vadRef.current?.destroy();
			} catch {
				/* ignore */
			}
			interruptKera();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// ── Azure TTS ─────────────────────────────────────────────────────────────
	const playAzureTTS = async (text: string) => {
		try {
			// Pause STT while Kera speaks (prevents her voice being transcribed)
			stopRecognizer();
			isSpeakingRef.current = true;
			setVoiceState("speaking");
			setVoiceText("");

			// Fetch a fresh token for TTS (same endpoint, avoids key in browser)
			const { token: ttsToken, region: ttsRegion } = await fetchSpeechToken();
			const cleanText = text.replace(/\*/g, "").replace(/[<>&'"]/g, "");
			const response = await fetch(
				`https://${ttsRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${ttsToken}`,
						"Content-Type": "application/ssml+xml",
						"X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
					},
					body: `<speak version='1.0' xml:lang='en-US'><voice xml:lang='en-US' xml:gender='Female' name='en-US-JennyNeural'><prosody rate="+10%">${cleanText}</prosody></voice></speak>`,
				},
			);

			if (response.ok) {
				const audio = new Audio(URL.createObjectURL(await response.blob()));
				currentAudioRef.current = audio;

				audio.onended = () => {
					URL.revokeObjectURL(audio.src);
					currentAudioRef.current = null;
					isSpeakingRef.current = false;
					setVoiceText("");
					if (micEnabledRef.current && componentMountedRef.current) {
						setVoiceState("listening");
						startRecognizer(); // resume listening after Kera finishes
					} else {
						setVoiceState("idle");
					}
				};
				audio.onerror = () => {
					currentAudioRef.current = null;
					isSpeakingRef.current = false;
					setVoiceState(micEnabledRef.current ? "listening" : "idle");
					if (micEnabledRef.current) startRecognizer();
				};
				// Wrap play() so autoplay-policy blocks can't hang forever
				try {
					await audio.play();
				} catch (playErr) {
					console.warn("[Azure TTS] play blocked by browser:", playErr);
					URL.revokeObjectURL(audio.src);
					currentAudioRef.current = null;
					isSpeakingRef.current = false;
					setVoiceState(micEnabledRef.current ? "listening" : "idle");
					if (micEnabledRef.current) startRecognizer();
					return;
				}
			} else {
				isSpeakingRef.current = false;
				setVoiceState(micEnabledRef.current ? "listening" : "idle");
				if (micEnabledRef.current) startRecognizer();
			}
		} catch (e) {
			console.error("[Azure TTS]", e);
			isSpeakingRef.current = false;
			setVoiceState(micEnabledRef.current ? "listening" : "idle");
			if (micEnabledRef.current) startRecognizer();
		}
	};

	// ── Send to Kera API ──────────────────────────────────────────────────────
	const sendToKera = async (text: string) => {
		if (isSendingRef.current || !text || text.trim().length < 2) return;
		isSendingRef.current = true;
		setVoiceText(text);

		try {
			const video = videoRef.current;
			if (!video) return;
			const mc = document.createElement("canvas");
			mc.width = video.videoWidth;
			mc.height = video.videoHeight;
			const mctx = mc.getContext("2d");
			if (!mctx) return;
			mctx.drawImage(video, 0, 0, mc.width, mc.height);

			if (drawingCanvasRef.current)
				mctx.drawImage(drawingCanvasRef.current, 0, 0, mc.width, mc.height);

			const res = await axios.post(
				`${getApiUrl()}/api/analyse/chat/`,
				{
					system:
						"You are Kera AI. The user has provided an image of their hair with their finger pointing or painting at a specific spot. Answer their specific question regarding the segment they painted or pointed to.",
					messages: [{ role: "user", content: text }],
					image: mc.toDataURL("image/jpeg", 0.8),
				},
				{ timeout: 15000 },
			);

			if (res.data?.reply) {
				chatHistoryRef.current = [
					...chatHistoryRef.current,
					{ role: "user", content: text },
					{ role: "assistant", content: res.data.reply },
				].slice(-20);
				await playAzureTTS(res.data.reply);
			}
		} catch (e) {
			console.error("[Kera AI] Chat error:", e);
			if (micEnabledRef.current && componentMountedRef.current)
				startRecognizer();
		} finally {
			isSendingRef.current = false;
		}
	};
	sendToKeraRef.current = sendToKera;

	// ── Build a fresh recognizer with a new token ────────────────────────────
	// Called each time user enables the mic (tokens last 10 min so this is fine).
	// Also pre-warms the token cache so TTS calls are instant.
	const buildAndStartRecognizer = async () => {
		// Tear down old recognizer if any
		if (recognizerRef.current) {
			const oldRec = recognizerRef.current;
			recognizerRef.current = null;
			try {
				oldRec.stopContinuousRecognitionAsync(
					() => {
						try {
							oldRec.close();
						} catch {
							/* ignore */
						}
					},
					() => {
						try {
							oldRec.close();
						} catch {
							/* ignore */
						}
					},
				);
			} catch {
				/* ignore */
			}
		}

		try {
			const { token, region } = await fetchSpeechToken();
			const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
				token,
				region,
			);
			speechConfig.speechRecognitionLanguage = "en-US";
			const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
			const recognizer = new SpeechSDK.SpeechRecognizer(
				speechConfig,
				audioConfig,
			);

			recognizer.recognizing = (_, e) => {
				if (!micEnabledRef.current) return;
				if (e.result.text) setVoiceText(e.result.text);
			};

			recognizer.recognized = (_, e) => {
				if (!micEnabledRef.current) return;
				if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
					const text = e.result.text.trim();
					if (text.length > 1 && !isSendingRef.current)
						sendToKeraRef.current?.(text);
				}
			};

			recognizer.canceled = (_, e) => {
				console.warn("[Kera STT] canceled:", e.errorDetails);
				// On token expiry or network drop, rebuild with a fresh token
				if (micEnabledRef.current && componentMountedRef.current) {
					setTimeout(() => {
						if (micEnabledRef.current && componentMountedRef.current)
							buildAndStartRecognizer();
					}, 2000);
				}
			};

			recognizerRef.current = recognizer;
			recognizer.startContinuousRecognitionAsync(
				() => setVoiceState("listening"),
				(err) => console.warn("[Kera STT] start error:", err),
			);
			// Pre-warm token cache so the first TTS response fires instantly (no extra round-trip)
			fetchSpeechToken().catch(() => {});
		} catch (e) {
			console.error("[Kera STT] buildAndStartRecognizer failed:", e);
			setVoiceState("idle");
		}
	};

	// ── Mic Toggle ────────────────────────────────────────────────────────────
	const toggleMic = () => {
		try {
			const AudioCtx =
				window.AudioContext ||
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(window as any).webkitAudioContext;
			new AudioCtx().resume();
		} catch {
			/* ignore */
		}
		// Unlock HTML5 Audio on this user gesture so TTS can play later
		try {
			const s = new Audio(
				"data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
			);
			s.volume = 0;
			s.play()
				.then(() => s.pause())
				.catch(() => {
					/* ignore */
				});
		} catch {
			/* ignore */
		}

		if (micEnabled) {
			// MUTE — stop everything immediately
			micEnabledRef.current = false;
			setMicEnabled(false);
			setVoiceState("idle");
			setVoiceText("");
			interruptKera();
			stopRecognizer();
			try {
				vadRef.current?.pause();
			} catch {
				/* ignore */
			}
		} else {
			// UNMUTE — fetch a fresh token and start recognizer
			micEnabledRef.current = true;
			setMicEnabled(true);
			setVoiceText("");
			setVoiceState("listening");
			buildAndStartRecognizer(); // async — token fetch then starts recognizer
			try {
				vadRef.current?.start();
			} catch {
				/* ignore */
			}
		}
	};

	// ── Drawing ───────────────────────────────────────────────────────────────
	const setupDrawingCanvas = () => {
		const canvas = drawingCanvasRef.current;
		if (!canvas || !videoRef.current) return;
		canvas.width = videoRef.current.clientWidth;
		canvas.height = videoRef.current.clientHeight;
	};
	useEffect(() => {
		window.addEventListener("resize", setupDrawingCanvas);
		return () => window.removeEventListener("resize", setupDrawingCanvas);
	}, []);

	// ── MediaPipe render loop ─────────────────────────────────────────────────
	useEffect(() => {
		if (!mediaPipeReady || !cameraActive) return;
		let running = true;
		const loop = () => {
			if (!running) return;
			const now = performance.now();
			if (
				videoRef.current &&
				!videoRef.current.paused &&
				now - lastProcessingTime.current > 150
			) {
				lastProcessingTime.current = now;
				try {
					if (segmentationRef.current && showSegRef.current) {
						segmentationRef.current.segmentForVideo(
							videoRef.current,
							now,
							drawHairOverlay,
						);
					} else if (!showSegRef.current && overlayCanvasRef.current) {
						// Just clear the hair overlay — hand skeleton drawn separately below
						const ov = overlayCanvasRef.current;
						ov.width = videoRef.current.videoWidth || 640;
						ov.height = videoRef.current.videoHeight || 480;
						ov.getContext("2d")!.clearRect(0, 0, ov.width, ov.height);
					}
				} catch {
					/* ignore */
				}
			}
			animFrameRef.current = requestAnimationFrame(loop);
		};
		loop();
		return () => {
			running = false;
		};
	}, [mediaPipeReady, cameraActive, drawHairOverlay]);

	// ── Live Analysis every 4s ────────────────────────────────────────────────
	const startLiveAnalysis = () => {
		analysisIntervalRef.current = setInterval(async () => {
			if (!videoRef.current || !canvasRef.current || isAnalysing) return;
			const v = videoRef.current,
				c = canvasRef.current;
			c.width = v.videoWidth;
			c.height = v.videoHeight;
			c.getContext("2d")!.drawImage(v, 0, 0);
			c.toBlob(
				async (blob) => {
					if (!blob) return;
					const fd = new FormData();
					fd.append(
						"image",
						new File([blob], "live.jpg", { type: "image/jpeg" }),
					);
					fd.append("live_mode", "true");
					try {
						const res = await axios.post(
							`${getApiUrl()}/api/analyse/live`,
							fd,
							{
								headers: { "Content-Type": "multipart/form-data" },
								timeout: 8000,
							},
						);
						if (res.data?.hair_type) {
							setLiveHairType(res.data.hair_type);
							setLiveConfidence(res.data.confidence);
						}
					} catch {
						/* ignore */
					}
				},
				"image/jpeg",
				0.6,
			);
		}, 4000);
	};

	// ── Capture ───────────────────────────────────────────────────────────────
	const processImageAndSend = async (blob: Blob) => {
		setIsAnalysing(true);
		setScanPhase("analysing");
		setError("");
		if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
		const fd = new FormData();
		fd.append("image", new File([blob], "scan.jpg", { type: "image/jpeg" }));
		fd.append("user_id", localStorage.getItem("kera_user_id") || "1");
		try {
			const response = await axios.post(`${getApiUrl()}/api/analyse/`, fd, {
				headers: { "Content-Type": "multipart/form-data" },
			});
			navigate("/results", {
				state: {
					data: response.data.data,
					chatHistory: chatHistoryRef.current,
				},
			});
		} catch {
			setError("Analysis failed. Check the backend server and try again.");
			setIsAnalysing(false);
			setScanPhase("idle");
			startLiveAnalysis();
		}
	};

	const handleCapture = () => {
		if (!videoRef.current || !canvasRef.current || isAnalysing) return;
		setScanPhase("captured");
		let count = 3;
		setCountdown(count);
		const timer = setInterval(() => {
			count--;
			if (count <= 0) {
				clearInterval(timer);
				setCountdown(null);
				const v = videoRef.current,
					c = canvasRef.current;
				if (!c || !v) return;
				c.width = v.videoWidth;
				c.height = v.videoHeight;
				c.getContext("2d")!.drawImage(v, 0, 0);
				c.toBlob(
					(b) => {
						if (b) processImageAndSend(b);
					},
					"image/jpeg",
					0.92,
				);
			} else setCountdown(count);
		}, 1000);
	};

	const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.[0]) processImageAndSend(e.target.files[0]);
	};

	const hairTypeColor = {
		Straight: "#6B9FD4",
		Wavy: "#82C882",
		Curly: "#E8A84A",
		Coily: "#C06B6B",
	};
	const liveColor = liveHairType ? hairTypeColor[liveHairType] : "#D4AF37";
	const micState = !micEnabled ? "idle" : voiceState; // idle | listening | speaking

	return (
		<div className="h-dvh bg-kera-dark text-kera-light flex flex-col relative overflow-hidden">
			{/* HEADER */}
			<div className="absolute top-0 w-full z-50 p-5 flex justify-between items-center bg-linear-to-b from-black/80 to-transparent">
				<button
					onClick={() => navigate("/")}
					className="text-white flex items-center gap-2 active:opacity-60"
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
							d="M15 19l-7-7 7-7"
						/>
					</svg>
					<span className="text-sm font-bold tracking-widest uppercase">
						Back
					</span>
				</button>
				<span className="text-sm font-black tracking-[0.25em] text-kera-gold">
					KERA AI
				</span>

				<div className="flex items-center gap-3">
					{/* Mic button: idle=muted-mic | listening=red-pulse-mic | speaking=gold-stop */}
					<button
						onClick={toggleMic}
						className={`w-8 h-8 flex items-center justify-center rounded-full border transition-all ${
							micState === "idle"
								? "bg-gray-800 border-gray-600 text-gray-500 hover:border-white hover:text-white"
								: micState === "listening"
									? "bg-red-500 border-red-500 text-white animate-pulse"
									: "bg-kera-gold/20 border-kera-gold text-kera-gold animate-pulse"
						}`}
						title={
							micState === "idle"
								? "Tap to talk to Kera"
								: micState === "listening"
									? "Listening — tap to mute"
									: "Kera speaking — tap to interrupt & mute"
						}
					>
						{micState === "idle" ? (
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<line
									x1="1"
									y1="1"
									x2="23"
									y2="23"
									strokeWidth={2}
									strokeLinecap="round"
								/>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"
								/>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23"
								/>
								<line
									x1="12"
									y1="19"
									x2="12"
									y2="23"
									strokeWidth={2}
									strokeLinecap="round"
								/>
								<line
									x1="8"
									y1="23"
									x2="16"
									y2="23"
									strokeWidth={2}
									strokeLinecap="round"
								/>
							</svg>
						) : micState === "speaking" ? (
							<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
								<rect x="6" y="6" width="12" height="12" rx="2" />
							</svg>
						) : (
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
									d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
								/>
							</svg>
						)}
					</button>

					<button
						onClick={() => setShowSegmentation((s) => !s)}
						className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border transition-colors ${showSegmentation ? "border-green-400 text-green-400" : "border-gray-500 text-gray-500"}`}
					>
						{showSegmentation ? "Seg ON" : "Seg OFF"}
					</button>
					{mediaPipeReady && (
						<span className="text-xs text-green-400 font-semibold tracking-wider flex items-center gap-1">
							<span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />{" "}
							LIVE
						</span>
					)}
					{!mediaPipeReady && <div className="w-12" />}
				</div>
			</div>

			{/* VIEWFINDER */}
			<div className="bg-black flex items-center justify-center overflow-hidden absolute inset-0">
				<video
					ref={videoRef}
					autoPlay
					playsInline
					muted
					className={`w-full h-full  rotate-y-180 object-cover transition-all duration-700 ${!cameraActive ? "hidden" : ""} ${isAnalysing ? "opacity-20 blur-sm scale-105" : ""}`}
				/>
				{!cameraActive && (
					<div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black p-8 text-center text-gray-500">
						<svg
							className="w-14 h-14 mx-auto mb-4 opacity-40"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
							/>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
						<p className="text-sm tracking-wide">
							{error || "Initialising camera…"}
						</p>
					</div>
				)}

				<canvas
					ref={overlayCanvasRef}
					className="absolute inset-0 w-full h-full object-cover pointer-events-none rotate-y-180 z-10 opacity-80"
				/>

				{/* Voice transcript */}
				{micEnabled && voiceText && (
					<div className="absolute top-24 left-4 right-4 z-40">
						<div className="bg-black/80 backdrop-blur-md rounded-xl p-3 border border-gray-600 shadow-xl">
							<p className="text-[10px] text-kera-gold font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
								<span
									className={`w-1.5 h-1.5 rounded-full bg-kera-gold ${voiceState === "listening" ? "animate-pulse" : ""}`}
								/>{" "}
								You
							</p>
							<p className="text-white text-sm font-medium leading-snug">
								{voiceText}
							</p>
						</div>
					</div>
				)}
				{micEnabled && !voiceText && voiceState === "listening" && (
					<div className="absolute top-24 left-4 right-4 z-40">
						<div className="bg-black/60 backdrop-blur-md rounded-xl p-3 border border-gray-700">
							<p className="text-[10px] text-kera-gold font-bold uppercase tracking-widest flex items-center gap-1.5">
								<span className="w-1.5 h-1.5 rounded-full bg-kera-gold animate-pulse" />{" "}
								Listening…
							</p>
						</div>
					</div>
				)}

				{/* Frame guides */}
				{!isAnalysing && cameraActive && (
					<div
						className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center"
						style={{ zIndex: 12 }}
					>
						<div className="w-56 h-72 relative">
							{[
								"top-0 left-0 border-t-2 border-l-2 rounded-tl-3xl",
								"top-0 right-0 border-t-2 border-r-2 rounded-tr-3xl",
								"bottom-0 left-0 border-b-2 border-l-2 rounded-bl-3xl",
								"bottom-0 right-0 border-b-2 border-r-2 rounded-br-3xl",
							].map((cls, i) => (
								<div
									key={i}
									className={`absolute w-8 h-8 border-kera-gold ${cls}`}
								/>
							))}
							<div className="absolute inset-0 overflow-hidden rounded-2xl">
								<div
									className="absolute w-full h-0.5 bg-linear-to-r from-transparent via-kera-gold to-transparent opacity-60"
									style={{ animation: "scanline 2.5s linear infinite", top: 0 }}
								/>
							</div>
						</div>
						<p className="mt-6 text-white/70 text-xs font-bold tracking-[0.2em] uppercase bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
							Align hair to frame
						</p>
					</div>
				)}

				{liveHairType && !isAnalysing && (
					<div className="absolute top-16 left-1/2 -translate-x-1/2 z-30">
						<div
							className="px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase text-black shadow-lg"
							style={{ backgroundColor: liveColor }}
						>
							{liveHairType} · {Math.round((liveConfidence || 0) * 100)}%
							confident
						</div>
					</div>
				)}

				{countdown !== null && (
					<div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
						<div
							className="text-9xl font-black text-kera-gold"
							style={{ animation: "countPulse 1s ease-out" }}
						>
							{countdown}
						</div>
					</div>
				)}

				{isAnalysing && (
					<div className="absolute inset-0 z-40 flex flex-col items-center justify-center">
						<div className="relative mb-8">
							<div className="w-20 h-20 border-4 border-gray-800 border-t-kera-gold rounded-full animate-spin" />
							<div
								className="absolute inset-0 w-20 h-20 border-4 border-transparent border-b-kera-gold/30 rounded-full animate-spin"
								style={{
									animationDuration: "1.5s",
									animationDirection: "reverse",
								}}
							/>
						</div>
						<h2 className="text-lg font-black tracking-[0.2em] text-white uppercase mb-1">
							Analysing
						</h2>
						<p className="text-kera-gold text-xs font-bold tracking-widest animate-pulse uppercase">
							CNN · GPT‑5 · Multi‑Agent
						</p>
					</div>
				)}
				<video className="hidden" onCanPlay={setupDrawingCanvas} />
			</div>

			<canvas ref={canvasRef} className="hidden" />

			{/* BOTTOM CONTROLS */}
			<div className="bg-black/75 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] px-5 rounded-t-4xl -mt-5 z-30 border-t border-gray-800/60 shadow-[0_-20px_50px_rgba(0,0,0,0.7)] shrink-0 absolute bottom-0 inset-x-0">
				{error && !isAnalysing && (
					<p className="text-red-400 text-xs font-semibold text-center mb-3">
						{error}
					</p>
				)}
				<div className="flex items-center justify-between max-w-xs mx-auto">
					<button
						onClick={() => fileInputRef.current?.click()}
						disabled={isAnalysing}
						className="flex flex-col items-center gap-1 text-gray-500 hover:text-white transition-colors disabled:opacity-30"
					>
						<div className="w-11 h-11 rounded-2xl bg-gray-800/80 border border-gray-700 flex items-center justify-center">
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
									d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
								/>
							</svg>
						</div>
						<span className="text-[10px] font-bold tracking-widest uppercase">
							Upload
						</span>
					</button>

					<button
						onClick={handleCapture}
						disabled={isAnalysing || !cameraActive}
						className="relative w-18 h-18 rounded-full disabled:opacity-30 active:scale-95 transition-transform"
					>
						<div className="absolute inset-0 rounded-full border-2 border-kera-gold/60" />
						<div className="absolute inset-2 rounded-full bg-white shadow-[0_0_20px_rgba(212,175,55,0.3)]" />
					</button>

					<div className="flex flex-col items-center gap-1 text-gray-600">
						<div className="w-11 h-11 rounded-2xl bg-gray-800/80 border border-gray-700 flex items-center justify-center">
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
									d="M13 10V3L4 14h7v7l9-11h-7z"
								/>
							</svg>
						</div>
						<span className="text-[10px] font-bold tracking-widest uppercase">
							Auto
						</span>
					</div>
				</div>
				<input
					type="file"
					accept="image/*"
					capture="user"
					className="hidden"
					ref={fileInputRef}
					onChange={handleFileUpload}
				/>

				{/* Demo tip */}
				<div className="absolute bottom-[calc(100%+1rem)] inset-x-0 justify-items-center">
					<div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 max-w-2xs">
						<p className="text-amber-200 text-[11px] leading-relaxed">
							<span className="font-black text-amber-400">💡 Tip</span> —
							Say&nbsp;
							<strong>&quot;how does my hair look today?&quot;</strong> and Kera
							will give you a live hair read out loud.
						</p>
					</div>
				</div>
			</div>

			<style>{`
        @keyframes scanline { 0%{top:0;opacity:0} 10%{opacity:.6} 90%{opacity:.6} 100%{top:100%;opacity:0} }
        @keyframes countPulse { 0%{transform:scale(1.4);opacity:0} 100%{transform:scale(1);opacity:1} }
      `}</style>
		</div>
	);
}
