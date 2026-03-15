import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const getApiUrl = () => {
  const saved = localStorage.getItem('VITE_API_URL');
  if (saved) return saved;
  const env = process.env.REACT_APP_API_URL;
  if (env) return env;
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') return window.location.origin;
  return 'http://127.0.0.1:5000';
};

const SUGGESTIONS = [
  "Why is my porosity important?",
  "How often should I deep condition?",
  "What's the best wash day routine for me?",
  "Why should I avoid sulfates?",
];

export default function ChatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state?.data;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const greeting = data
      ? `Hi! I'm Kera \u{1F44B} I've analysed your ${data.exact_subtype || data.hair_group || ''} hair. What would you like to know?`
      : `Hi! I'm Kera \u{1F44B} Ask me anything about hair care!`;
    setMessages([{ role: 'assistant', content: greeting }]);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const buildSystem = () => {
    if (!data) return "You are Kera, an expert AI hair advisor. Be warm, specific, and concise.";
    return `You are Kera, an expert hair advisor. The user has ${data.exact_subtype || data.hair_group || 'unknown'} hair, ${data.porosity || 'unknown'} porosity, ${data.texture || 'unknown'} texture, scalp score ${data.scalp_score || 0}/10. Be specific to their hair type. Keep replies to 2-4 sentences.`;
  };

  const send = async (text) => {
    const t = text.trim();
    if (!t || isTyping) return;
    const userMsg = { role: 'user', content: t };
    setMessages(p => [...p, userMsg]);
    setInput('');
    setIsTyping(true);
    try {
      const history = [...messages, userMsg].slice(-10).map(m => ({ role: m.role, content: m.content }));
      const res = await axios.post(`${getApiUrl()}/api/analyse/chat/`, { system: buildSystem(), messages: history });
      const reply = res.data?.reply || "I'm not sure \u2014 could you rephrase?";
      setMessages(p => [...p, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: "Can't reach the backend. Is Flask running?" }]);
    }
    setIsTyping(false);
  };

  return (
    <div className="min-h-screen bg-[#0E0E0E] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-800">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm"
          style={{ background: 'linear-gradient(135deg, #D4AF37, #1A1A1A)' }}>K</div>
        <div>
          <p className="text-white font-black text-sm">Kera AI</p>
          <p className="text-gray-500 text-[10px]">Hair & scalp advisor</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
              m.role === 'user' ? 'bg-kera-gold text-white rounded-br-none' : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-bl-none'
            }`}>{m.content}</div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-900 border border-gray-800 px-4 py-3 rounded-2xl flex items-center gap-1.5">
              {[0, 0.15, 0.3].map((d, i) => (
                <div key={i} className="w-1.5 h-1.5 bg-gray-500 rounded-full" style={{ animation: `bounce 1.2s ease-in-out ${d}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-2">Quick questions</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {SUGGESTIONS.map((q, i) => (
              <button key={i} onClick={() => send(q)}
                className="shrink-0 bg-gray-900 border border-gray-700 text-gray-300 text-xs font-semibold px-3 py-2 rounded-full whitespace-nowrap">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-2xl px-4 py-2.5">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send(input)}
            placeholder="Message Kera..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-gray-500 text-sm outline-hidden" />
          <button onClick={() => send(input)} disabled={!input.trim() || isTyping}
            className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30"
            style={{ backgroundColor: input.trim() ? '#D4AF37' : '#333' }}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }
      `}</style>
    </div>
  );
}
