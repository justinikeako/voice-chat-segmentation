import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();
  const [apiUrl, setApiUrl] = useState(localStorage.getItem('VITE_API_URL') || '');
  const [showSettings, setShowSettings] = useState(false);

  const saveUrl = () => {
    if (apiUrl.trim()) localStorage.setItem('VITE_API_URL', apiUrl.trim());
    else localStorage.removeItem('VITE_API_URL');
    setShowSettings(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] pb-24">
      <div className="bg-kera-dark px-6 pt-14 pb-8 relative">
        <button onClick={() => setShowSettings(!showSettings)} className="absolute top-5 right-5 text-gray-500 hover:text-white text-lg">⚙️</button>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-kera-gold flex items-center justify-center text-2xl font-black text-kera-dark">K</div>
          <div>
            <h1 className="text-2xl font-black text-white">Kera <span className="text-kera-gold">AI</span></h1>
            <p className="text-gray-400 text-xs">Your AI Hair Expert</p>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-xs border border-gray-200">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">API URL (for mobile/ngrok)</p>
          <input value={apiUrl} onChange={e => setApiUrl(e.target.value)} placeholder="https://your-ngrok-url.ngrok.io"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm mb-2" />
          <button onClick={saveUrl} className="w-full py-2 bg-kera-dark text-white rounded-xl text-xs font-bold">Save</button>
        </div>
      )}

      <div className="px-4 pt-6 space-y-3">
        <button onClick={() => navigate('/scan')}
          className="w-full bg-white rounded-2xl p-6 shadow-xs text-left active:scale-[0.98] transition-transform">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #f59e0b)' }}>📡</div>
            <div>
              <p className="font-black text-kera-dark text-base">Scan My Hair</p>
              <p className="text-gray-400 text-xs mt-0.5">Live camera with AI hair segmentation</p>
            </div>
          </div>
        </button>

        <button onClick={() => navigate('/chat')}
          className="w-full bg-white rounded-2xl p-6 shadow-xs text-left active:scale-[0.98] transition-transform">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gray-900 flex items-center justify-center text-2xl">💬</div>
            <div>
              <p className="font-black text-kera-dark text-base">Talk to Kera</p>
              <p className="text-gray-400 text-xs mt-0.5">Ask questions about your hair</p>
            </div>
          </div>
        </button>
      </div>

      <p className="text-center text-gray-300 text-[10px] mt-8">Stage 3 — Camera + Chat · No voice yet</p>
    </div>
  );
}
