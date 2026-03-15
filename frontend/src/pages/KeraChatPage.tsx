import { useState, useRef, useEffect } from "react";
import type { KeyboardEvent, ChangeEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { getApiUrl, cn } from "../lib/utils";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { DemoTip } from "../components/ui/demo-tip";

const SUGGESTED_QUESTIONS = [
	"Why is my porosity important?",
	"How often should I deep condition?",
	"What's the best wash day routine for me?",
	"Why should I avoid sulfates?",
	"How do I know if my hair is healthy?",
	"What does my scalp score mean?",
];

interface ChatScanData {
	hair_group?: string;
	hair_type_confirmed?: string;
	exact_subtype?: string;
	hair_subtype?: string;
	porosity?: string;
	texture?: string;
	scalp_score?: number;
	scalp_condition?: string;
	ingredients_to_seek?: string[];
	ingredients_to_avoid?: string[];
	care_recommendations?: string[];
}

interface ChatMessage { role: "user" | "assistant"; content: string; ts: number }

interface SpeechRecognitionResultItem { transcript: string }
interface SpeechRecognitionResultLike { isFinal: boolean; 0: SpeechRecognitionResultItem }
interface SpeechRecognitionEventLike { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> }
interface SpeechRecognitionLike { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; onresult: ((e: SpeechRecognitionEventLike) => void) | null; onend: (() => void) | null; onerror: (() => void) | null }
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export default function KeraChatPage() {
	const location = useLocation() as { state?: { data?: ChatScanData } };
	const navigate = useNavigate();
	const data = location.state?.data;

	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const [isTyping, setIsTyping] = useState(false);
	const [isListening, setIsListening] = useState(false);
	const [isSpeaking, setIsSpeaking] = useState(false);
	const [isMuted, setIsMuted] = useState(false);
	const [voiceSupported] = useState(() => "webkitSpeechRecognition" in window || "SpeechRecognition" in window);
	const bottomRef = useRef<HTMLDivElement | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const stopAudio = () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; setIsSpeaking(false); } };

	const buildSystemContext = () => {
		if (!data) return "You are Kera, an expert AI hair and scalp advisor. Be warm, specific, and empowering.";
		const hairGroup = data.hair_group || data.hair_type_confirmed || "Unknown";
		const subtype = data.exact_subtype || data.hair_subtype || hairGroup;
		const porosity = data.porosity || "unknown";
		const texture = data.texture || "unknown";
		const scalpScore = data.scalp_score || 0;
		const scalpCond = data.scalp_condition || "Healthy";
		const seeks = (data.ingredients_to_seek || []).join(", ");
		const avoids = (data.ingredients_to_avoid || []).join(", ");
		const tips = (data.care_recommendations || []).join(" | ");
		return `You are Kera, an expert Afro-Caribbean hair and scalp AI advisor.\n\nUser's results:\n- Hair type: ${subtype} (${hairGroup})\n- Porosity: ${porosity}\n- Texture: ${texture}\n- Scalp: ${scalpScore}/10 (${scalpCond})\n- Seek: ${seeks}\n- Avoid: ${avoids}\n- Care: ${tips}\n\nBe warm, specific, concise (2-4 sentences). Reference their scan data. Never be condescending.`;
	};

	useEffect(() => {
		const hairGroup = data?.hair_group || data?.hair_type_confirmed || "your hair";
		const subtype = data?.exact_subtype || data?.hair_subtype || "";
		const greeting = data
			? `Hi! I'm Kera — I've just analysed your ${subtype} ${hairGroup !== subtype ? hairGroup : ""} hair. Your scalp scored ${data.scalp_score || "—"}/10 and your porosity is ${data.porosity || "—"}. What would you like to know?`
			: `Hi! I'm Kera — your AI hair advisor. Ask me anything about hair care, products, or routines!`;
		setMessages([{ role: "assistant", content: greeting, ts: Date.now() }]);
	}, []);

	useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

	const sendMessage = async (text: string) => {
		const userText = text.trim();
		if (!userText || isTyping) return;
		stopAudio();
		const userMsg: ChatMessage = { role: "user", content: userText, ts: Date.now() };
		if (isListening && recognitionRef.current) { recognitionRef.current.stop(); setIsListening(false); }
		setInput(""); setIsTyping(true);
		setMessages((prev) => [...prev, userMsg]);
		try {
			const systemCtx = buildSystemContext();
			const chatHistory = [...messages, userMsg].slice(-10).map((m) => ({ role: m.role, content: m.content }));
			const API_BASE_URL = getApiUrl();
			const res = await axios.post(`${API_BASE_URL}/api/analyse/chat/`, { system: systemCtx, messages: chatHistory });
			const reply = res.data?.reply;
			if (reply) {
				setMessages((p) => [...p, { role: "assistant", content: reply, ts: Date.now() }]);
			} else {
				setMessages((p) => [...p, { role: "assistant", content: "Let me try that again — could you rephrase your question?", ts: Date.now() }]);
			}
			if (!isMuted && reply) {
				try {
					const cleanText = reply.replace(/\*/g, "").replace(/[<>&'"]/g, "");
					setIsSpeaking(true);
					const tokenRes = await fetch(`${API_BASE_URL}/api/analyse/speech-token`);
					if (!tokenRes.ok) throw new Error("Speech token fetch failed");
					const { token, region } = await tokenRes.json();
					const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
						method: "POST",
						headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3" },
						body: `<speak version='1.0' xml:lang='en-US'><voice xml:lang='en-US' xml:gender='Female' name='en-US-JennyNeural'><prosody rate="+10%">${cleanText}</prosody></voice></speak>`,
					});
					if (response.ok) {
						const blob = await response.blob();
						const audioUrl = URL.createObjectURL(blob);
						const audio = new Audio(audioUrl);
						audioRef.current = audio;
						audio.onended = () => { URL.revokeObjectURL(audioUrl); setIsSpeaking(false); };
						audio.onerror = () => { URL.revokeObjectURL(audioUrl); setIsSpeaking(false); };
						await audio.play();
					} else { setIsSpeaking(false); }
				} catch (e) { console.error("[Azure TTS] Error:", e); setIsSpeaking(false); }
			}
		} catch { setMessages((p) => [...p, { role: "assistant", content: "Sorry, I can't connect to the backend right now.", ts: Date.now() }]); } finally { setIsTyping(false); }
	};

	const toggleVoice = () => {
		if (isListening) { if (recognitionRef.current) recognitionRef.current.stop(); setIsListening(false); return; }
		try {
			const speechWindow = window as any;
			const SR = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
			if (!SR) return;
			const recognition = new (SR as SpeechRecognitionConstructor)();
			recognition.lang = "en-US"; recognition.continuous = true; recognition.interimResults = true;
			recognition.onresult = (e) => {
				let finalT = ""; let interimT = "";
				for (let i = e.resultIndex; i < e.results.length; ++i) { if (e.results[i].isFinal) finalT += e.results[i][0].transcript; else interimT += e.results[i][0].transcript; }
				if (finalT) { setInput(""); sendMessage(finalT); } else if (interimT) setInput(interimT);
			};
			recognition.onend = () => setIsListening(false);
			recognition.onerror = () => setIsListening(false);
			recognitionRef.current = recognition; recognition.start(); setIsListening(true);
		} catch { setIsListening(false); }
	};

	useEffect(() => { return () => { stopAudio(); if (recognitionRef.current) { recognitionRef.current.onend = null; recognitionRef.current.stop(); } }; }, []);

	const hairGroup = data?.hair_group || data?.hair_type_confirmed || "";

	return (
		<div className="min-h-screen bg-brutal-white flex flex-col">
			{/* Header */}
			<div className="brutal-border-b bg-brutal-white px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
				<button onClick={() => navigate(-1)} className="text-brutal-black/40 hover:text-brutal-black font-black cursor-pointer">&larr;</button>
				<div className={cn("w-10 h-10 brutal-border-thin flex items-center justify-center font-black text-sm shrink-0 transition-transform", isSpeaking ? "bg-brutal-yellow scale-110" : "bg-brutal-lavender")}>
					K
				</div>
				<div className="flex-1 min-w-0">
					<p className="font-black text-sm uppercase tracking-tight flex items-center gap-2">
						Kera AI
						{isSpeaking && <Badge variant="success" className="text-[9px] animate-pulse">Speaking</Badge>}
					</p>
					<p className="text-brutal-black/40 text-[10px] font-bold">
						{data ? `Your ${data.exact_subtype || hairGroup} hair advisor` : "Hair & scalp advisor"}
					</p>
				</div>
				{hairGroup && <Badge variant="warning">{data?.exact_subtype || hairGroup}</Badge>}
			</div>

			{/* Messages */}
			<div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
				{messages.map((m, i) => (
					<div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
						<div className={cn(
							"max-w-[85%] brutal-border p-3 text-sm leading-relaxed",
							m.role === "user"
								? "bg-brutal-yellow brutal-shadow-sm"
								: "bg-brutal-white brutal-shadow-sm"
						)}>
							{m.role === "assistant" && <p className="text-[9px] font-black tracking-widest text-brutal-black/40 uppercase mb-1">Kera</p>}
							{m.content}
						</div>
					</div>
				))}
				{isTyping && (
					<div className="flex justify-start">
						<div className="brutal-border bg-brutal-white brutal-shadow-sm p-3 flex items-center gap-1.5">
							{[0, 0.15, 0.3].map((delay, i) => (
								<div key={i} className="w-1.5 h-1.5 bg-brutal-black/30" style={{ animation: `typingDot 1.2s ease-in-out ${delay}s infinite` }} />
							))}
						</div>
					</div>
				)}
				<div ref={bottomRef} />
			</div>

			{/* Suggested questions */}
			{messages.length <= 1 && (
				<div className="px-4 pb-2">
					<p className="text-[10px] font-black uppercase tracking-widest text-brutal-black/40 mb-2">Quick questions</p>
					<div className="flex gap-2 overflow-x-auto pb-1">
						{SUGGESTED_QUESTIONS.map((q, i) => (
							<button key={i} onClick={() => sendMessage(q)} className="shrink-0 brutal-border-thin bg-brutal-white text-brutal-black/70 text-xs font-black px-3 py-2 hover:bg-brutal-yellow/20 transition-colors whitespace-nowrap cursor-pointer">
								{q}
							</button>
						))}
					</div>
				</div>
			)}

			<div className="px-4 pb-1">
				<DemoTip />
			</div>

			{/* Input bar */}
			<div className="p-4 brutal-border-t bg-brutal-white">
				<div className="flex items-center gap-2 mb-2">
					{voiceSupported && (
						<button
							onClick={() => setIsMuted(!isMuted)}
							className={cn(
								"text-[10px] font-black uppercase tracking-widest px-3 py-1.5 brutal-border-thin transition-colors cursor-pointer",
								isMuted ? "bg-brutal-coral text-brutal-black" : "bg-brutal-lime text-brutal-black"
							)}
						>
							{isMuted ? "Muted" : "Voice On"}
						</button>
					)}
				</div>
				<div className="flex items-center gap-2">
					<input
						ref={inputRef}
						type="text"
						value={input}
						onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
						onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") sendMessage(input); }}
						placeholder={isListening ? "Listening..." : "Message Kera..."}
						className="flex-1 brutal-border px-4 py-3 bg-brutal-white text-sm font-medium placeholder:text-brutal-black/30 placeholder:uppercase placeholder:text-xs placeholder:font-bold focus:outline-none focus:ring-3 focus:ring-brutal-yellow"
					/>
					{voiceSupported && (
						<button
							onClick={toggleVoice}
							className={cn(
								"w-11 h-11 brutal-border flex items-center justify-center shrink-0 transition-all cursor-pointer",
								isListening ? "bg-brutal-coral text-brutal-black animate-pulse" : "bg-brutal-white hover:bg-brutal-black/5"
							)}
						>
							<span className="font-black text-sm">
								{isListening ? "●" : "◇"}
							</span>
						</button>
					)}
					<Button size="md" onClick={() => sendMessage(input)} disabled={!input.trim() || isTyping} className="shrink-0">
						Send
					</Button>
				</div>
			</div>

			<style>{`@keyframes typingDot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }`}</style>
		</div>
	);
}
