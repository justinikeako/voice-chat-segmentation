// frontend/src/pages/KeraChatPage.jsx
// Add this route to App.jsx:
// import KeraChatPage from './pages/KeraChatPage';
// <Route path="/chat" element={<KeraChatPage />} />

import { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent, ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DemoTip } from './HomePage';

// Smart API URL: when accessed via ngrok on mobile, use the same origin
const getApiUrl = () => {
  const saved = localStorage.getItem('VITE_API_URL');
  if (saved) return saved;
  const env = process.env.REACT_APP_API_URL;
  if (env) return env;
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return window.location.origin;
  }
  return 'http://127.0.0.1:5000';
};

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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionResultItem;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export default function KeraChatPage() {
  const location = useLocation() as { state?: { data?: ChatScanData } };
  const navigate = useNavigate();
  const data = location.state?.data;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceSupported] = useState(() => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop any playing Azure TTS audio
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
    }
  };

  // ─── Build system context from scan data ─────────────────────────────────
  const buildSystemContext = () => {
    if (!data) return "You are Kera, an expert AI hair and scalp advisor. Be warm, specific, and empowering.";

    const hairGroup = data.hair_group || data.hair_type_confirmed || 'Unknown';
    const subtype = data.exact_subtype || data.hair_subtype || hairGroup;
    const porosity = data.porosity || 'unknown';
    const texture = data.texture || 'unknown';
    const scalpScore = data.scalp_score || 0;
    const scalpCond = data.scalp_condition || 'Healthy';
    const seeks = (data.ingredients_to_seek || []).join(', ');
    const avoids = (data.ingredients_to_avoid || []).join(', ');
    const tips = (data.care_recommendations || []).join(' | ');

    return `You are Kera, an expert Afro-Caribbean hair and scalp AI advisor built into the Kera AI app.

You have JUST analysed this specific user's hair. Here are their results:
- Hair type: ${subtype} (${hairGroup} group)
- Porosity: ${porosity}
- Texture: ${texture}
- Scalp score: ${scalpScore}/10 (${scalpCond})
- Ingredients to seek: ${seeks}
- Ingredients to avoid: ${avoids}
- Care recommendations: ${tips}

Your role:
- Answer questions about THEIR specific hair type, porosity, scalp health, and the care plan above
- Give product and routine advice tailored to their exact profile
- Be warm, confident, and specific — not generic
- Keep replies concise (2-4 sentences max) unless they ask for detail
- Never be condescending; speak like a knowledgeable friend
- Reference their scan data when relevant (e.g. "Because your porosity is ${porosity}...")
- You can also answer general hair questions even if unrelated to their scan`;
  };

  // ─── Greeting on mount ────────────────────────────────────────────────────
  useEffect(() => {
    const hairGroup = data?.hair_group || data?.hair_type_confirmed || 'your hair';
    const subtype = data?.exact_subtype || data?.hair_subtype || '';
    const greeting = data
      ? `Hi! I'm Kera 👋 I've just analysed your ${subtype} ${hairGroup !== subtype ? hairGroup : ''} hair. Your scalp scored ${data.scalp_score || '—'}/10 and your porosity is ${data.porosity || '—'}. What would you like to know about your hair?`
      : `Hi! I'm Kera 👋 I'm your AI hair advisor. Ask me anything about hair care, products, or routines!`;
    setMessages([{ role: 'assistant', content: greeting, ts: Date.now() }]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ─── Send message ─────────────────────────────────────────────────────────
  const sendMessage = async (text: string) => {
    const userText = text.trim();
    if (!userText || isTyping) return;

    // Interrupt any active agent speaking if we send a new message
    stopAudio();

    const userMsg: ChatMessage = { role: 'user', content: userText, ts: Date.now() };

    // Stop listening when sending a message to prevent conflict
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setInput('');
    setIsTyping(true);

    // Add user message immediately
    setMessages((prev) => [...prev, userMsg]);

    try {
      const systemCtx = buildSystemContext();
      // Build chat history from current messages + the new user message
      const chatHistory = [...messages, userMsg]
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const API_BASE_URL = getApiUrl();
      const res = await axios.post(`${API_BASE_URL}/api/analyse/chat/`, {
        system: systemCtx,
        messages: chatHistory,
      });

      const reply = res.data?.reply;
      if (reply) {
        setMessages((p) => [...p, { role: 'assistant', content: reply, ts: Date.now() }]);
      } else {
        setMessages((p) => [...p, { role: 'assistant', content: "Let me try that again — could you rephrase your question?", ts: Date.now() }]);
      }

      // ─── Azure TTS for playback (uses backend token endpoint like ScanPage) ──
      if (!isMuted && reply) {
        try {
          const cleanText = reply.replace(/\*/g, '').replace(/[<>&'"]/g, '');
          setIsSpeaking(true);

          // Fetch speech token from backend (avoids exposing API key in browser)
          const tokenRes = await fetch(`${API_BASE_URL}/api/analyse/speech-token`);
          if (!tokenRes.ok) throw new Error('Speech token fetch failed');
          const { token, region } = await tokenRes.json() as { token: string; region: string };

          const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/ssml+xml',
              'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
            },
            body: `<speak version='1.0' xml:lang='en-US'><voice xml:lang='en-US' xml:gender='Female' name='en-US-JennyNeural'><prosody rate="+10%">${cleanText}</prosody></voice></speak>`
          });

          if (response.ok) {
            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
              setIsSpeaking(false);
            };
            audio.onerror = () => {
              URL.revokeObjectURL(audioUrl);
              setIsSpeaking(false);
            };

            await audio.play();
          } else {
            console.warn('[Azure TTS] Request failed:', response.statusText);
            setIsSpeaking(false);
          }
        } catch (e) {
          console.error('[Azure TTS] Error:', e);
          setIsSpeaking(false);
        }
      }
    } catch (err) {
      console.error('[Kera Chat] Error:', err);
      setMessages((p) => [...p, {
        role: 'assistant',
        content: "Sorry, I can't connect to the backend right now. Make sure Flask is running!",
        ts: Date.now(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // ─── Voice input ─────────────────────────────────────────────────────────
  const toggleVoice = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const speechWindow = window as Window & {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      };
      const SpeechRecognition =
        speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
      if (!SpeechRecognition) return;

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (e: SpeechRecognitionEventLike) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            finalTranscript += e.results[i][0].transcript;
          } else {
            interimTranscript += e.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          // We append it right away to input and send it
          setInput('');
          sendMessage(finalTranscript);
        } else if (interimTranscript) {
          setInput(interimTranscript);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (e) {
      console.warn("Speech recognition failed to start", e);
      setIsListening(false);
    }
  };

  useEffect(() => {
    return () => {
      stopAudio();
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hairGroup = data?.hair_group || data?.hair_type_confirmed || '';
  const hairTypeColors: Record<string, string> = {
    Straight: '#6B9FD4', Wavy: '#82C882', Curly: '#E8A84A', Coily: '#C06B6B',
  };
  const accentColor = hairTypeColors[hairGroup] || '#D4AF37';

  return (
    <div className="min-h-screen bg-[#0E0E0E] flex flex-col">

      {/* ── HEADER ── */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-800/60 bg-[#0E0E0E]">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Avatar with speaking animation */}
        <div className="relative">
          <div
            className={`w-10 h-10 rounded-full flex flex-col items-center justify-center text-white font-black text-sm flex-shrink-0 z-10 relative transition-transform duration-300 ${isSpeaking ? 'scale-110' : ''}`}
            style={{ background: `linear-gradient(135deg, ${accentColor}, #1A1A1A)` }}
          >
            K
          </div>
          {isSpeaking && (
            <div className="absolute inset-0 z-0">
              <div className="absolute inset-0 rounded-full animate-ping opacity-75" style={{ backgroundColor: accentColor }}></div>
              <div className="absolute -inset-2 rounded-full border border-current opacity-30 animate-pulse" style={{ color: accentColor }}></div>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 ml-2">
          <p className="text-white font-black text-sm tracking-wide flex items-center gap-2">
            Kera AI
            {isSpeaking && <span className="text-[9px] uppercase tracking-widest text-green-400 animate-pulse">Speaking</span>}
          </p>
          <p className="text-gray-500 text-[10px] font-medium">
            {data ? `Your ${data.exact_subtype || hairGroup} hair advisor` : 'Hair & scalp advisor'}
          </p>
        </div>

        {/* Hair type badge */}
        {hairGroup && (
          <span
            className="text-[10px] font-black px-2.5 py-1 rounded-full text-black shadow-lg"
            style={{ backgroundColor: accentColor }}
          >
            {data?.exact_subtype || hairGroup}
          </span>
        )}
      </div>

      {/* ── MESSAGES ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        <div className="flex flex-col gap-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed shadow-sm ${m.role === 'user'
                  ? 'bg-kera-gold text-white rounded-br-none'
                  : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-bl-none'
                  }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black mr-2 flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${accentColor}, #333)` }}
              >
                K
              </div>
              <div className="bg-gray-900 border border-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                {[0, 0.15, 0.3].map((delay, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-gray-500 rounded-full"
                    style={{ animation: `typingDot 1.2s ease-in-out ${delay}s infinite` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* ── SUGGESTED QUESTIONS ── */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-2">Quick questions</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="flex-shrink-0 bg-gray-900 border border-gray-700 text-gray-300 text-xs font-semibold px-3 py-2 rounded-full hover:border-gray-500 transition-colors whitespace-nowrap"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <DemoTip dark />

      {/* ── INPUT BAR ── */}
      <div className="p-4 border-t border-gray-800/60 bg-[#0E0E0E]">
        <div className="flex items-center gap-2 mb-2">
          {voiceSupported && (
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase transition-colors ${isMuted ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/20 text-green-400 border border-green-400/30'
                }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMuted ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                )}
              </svg>
              {isMuted ? 'Agent Muted' : 'Agent Voice On'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-2xl px-4 py-2.5">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') sendMessage(input);
            }}
            placeholder={isListening ? "Listening..." : "Message Kera..."}
            className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-gray-500 text-sm h-full py-1"
          />
          {voiceSupported && (
            <button
              onClick={toggleVoice}
              className={`p-1.5 rounded-full transition-all flex-shrink-0 ${isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none'
                }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}

          {/* Send button */}
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isTyping}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
            style={{ backgroundColor: input.trim() ? accentColor : '#333' }}
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}