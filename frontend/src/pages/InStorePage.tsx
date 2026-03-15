// frontend/src/pages/InStorePage.jsx
// Point camera at a product shelf — Kera tells you if it's right for your hair.
// Also works for "product battle" demo: two bottles, Kera picks the right one.
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BottomNav, DemoTip } from './HomePage';

const getApiUrl = () => {
  const saved = localStorage.getItem('VITE_API_URL');
  if (saved) return saved;
  const env = process.env.REACT_APP_API_URL;
  if (env) return env;
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') return window.location.origin;
  return 'http://127.0.0.1:5000';
};

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
  const navigate   = useNavigate();
  const location = useLocation() as { state?: { data?: ScanData } };
  const passedData = location.state?.data;

  const hairType    = passedData?.exact_subtype || localStorage.getItem('kera_hair_type') || '4C';
  const hairProfile = passedData ? JSON.stringify({
    porosity: passedData.porosity,
    texture:  passedData.texture,
    scalp:    passedData.scalp_condition,
  }) : '';

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startingRef = useRef(false);

  const [cameraOn, setCameraOn]   = useState(false);
  const [scanning, setScanning]   = useState(false);
  const [result, setResult] = useState<InStoreResult | null>(null);
  const [history, setHistory] = useState<InStoreResult[]>([]); // past scans this session
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment'); // back camera for shelf scanning

  // ── Camera ────────────────────────────────────────────────────────────────
  const startCamera = async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch { alert('Camera access needed.'); }
    finally { startingRef.current = false; }
  };

  useEffect(() => { startCamera(); return () => streamRef.current?.getTracks().forEach((t) => t.stop()); }, [facingMode]);

  // ── Scan product ──────────────────────────────────────────────────────────
  const doScan = async () => {
    if (!videoRef.current || !canvasRef.current || scanning) return;
    setScanning(true);
    setResult(null);

    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext('2d');
    if (!ctx) {
      setScanning(false);
      return;
    }
    ctx.drawImage(v, 0, 0);
    const dataUrl = c.toDataURL('image/jpeg', 0.85);

    try {
      const res = await fetch(`${getApiUrl()}/api/marketplace/scan-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, hair_type: hairType, hair_profile: hairProfile }),
      });
      const data = await res.json() as InStoreResult;
      setResult(data);
      setHistory((h) => [{ ...data, timestamp: new Date().toLocaleTimeString() }, ...h].slice(0, 5));
    } catch {
      setResult({ verdict: 'ERROR', reason: 'Could not analyse — check connection.' });
    } finally {
      setScanning(false);
    }
  };

  const verdictConfig: Record<string, { color: string; bg: string; border: string; icon: string; label: string }> = {
    GOOD:  { color: '#22c55e', bg: 'bg-green-50',  border: 'border-green-200',  icon: '✅', label: 'Great Choice!' },
    BAD:   { color: '#ef4444', bg: 'bg-red-50',    border: 'border-red-200',    icon: '❌', label: 'Not For You' },
    OK:    { color: '#f59e0b', bg: 'bg-amber-50',  border: 'border-amber-200',  icon: '⚠️', label: 'Use With Caution' },
    ERROR: { color: '#6b7280', bg: 'bg-gray-50',   border: 'border-gray-200',   icon: '⚡',  label: 'Try Again' },
  };
  const vc = verdictConfig[result?.verdict ?? 'ERROR'] || verdictConfig.ERROR;

  return (
    <div className="min-h-screen bg-[#111] pb-28 flex flex-col">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-14 pb-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-gray-400 flex items-center gap-1 text-sm font-semibold">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black tracking-[0.3em] text-sky-400 uppercase">In-Store Mode</p>
          <p className="text-white text-xs font-bold">{hairType} hair</p>
        </div>
        <button
          onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}
          className="text-gray-400 hover:text-white text-xs font-semibold"
        >
          🔄 Flip
        </button>
      </div>

      {/* ── CAMERA VIEWFINDER ──────────────────────────────────────────────── */}
      <div className="relative flex-1 mx-4 rounded-2xl overflow-hidden bg-black" style={{ minHeight: 300 }}>
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />

        {/* Scan reticle */}
        {!scanning && !result && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-sky-400/60 rounded-xl" style={{ width: '70%', height: '65%' }}>
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-sky-400 rounded-tl-xl -translate-x-px -translate-y-px" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-sky-400 rounded-tr-xl translate-x-px -translate-y-px" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-sky-400 rounded-bl-xl -translate-x-px translate-y-px" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-sky-400 rounded-br-xl translate-x-px translate-y-px" />
            </div>
            <p className="absolute bottom-6 text-sky-300 text-xs font-bold tracking-widest uppercase animate-pulse">
              Point at product label
            </p>
          </div>
        )}

        {/* Scanning overlay */}
        {scanning && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 border-4 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
            <p className="text-sky-300 text-sm font-black tracking-wider">Kera is reading the label…</p>
          </div>
        )}

        {/* Result overlay */}
        {result && !scanning && (
          <div className={`absolute inset-x-0 bottom-0 ${vc.bg} ${vc.border} border-t-2 p-4 backdrop-blur-sm`}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{vc.icon}</span>
              <div>
                <p className="font-black text-gray-900 text-base">{vc.label}</p>
                {(result.products_detected?.length ?? 0) > 0 && (
                  <p className="text-xs text-gray-500">{result.products_detected?.join(', ')}</p>
                )}
              </div>
              {result.confidence && (
                <span className="ml-auto text-sm font-black" style={{ color: vc.color }}>{result.confidence}%</span>
              )}
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{result.reason}</p>
            {result.recommendation && (
              <p className="mt-2 text-xs text-gray-500 italic">{result.recommendation}</p>
            )}
            {(result.key_ingredients_found?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {result.key_ingredients_found?.map((ing: string, i: number) => (
                  <span key={i} className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">✓ {ing}</span>
                ))}
              </div>
            )}
            {(result.ingredients_to_avoid_found?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {result.ingredients_to_avoid_found?.map((ing: string, i: number) => (
                  <span key={i} className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">✗ {ing}</span>
                ))}
              </div>
            )}
            <button onClick={() => setResult(null)} className="mt-3 w-full py-2 border border-gray-300 rounded-xl text-xs font-black text-gray-500">
              Scan Another Product
            </button>
          </div>
        )}
      </div>

      {/* ── SCAN BUTTON ────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4">
        <button
          onTouchStart={doScan} onClick={doScan}
          disabled={scanning || !cameraOn}
          className="w-full py-4 rounded-2xl text-sm font-black tracking-wider uppercase disabled:opacity-50 active:scale-[0.98] transition-all"
          style={{ background: scanning ? '#374151' : 'linear-gradient(135deg, #0ea5e9, #60a5fa)', color: 'white' }}
        >
          {scanning ? '🔍 Analysing…' : '🔍 Scan This Product'}
        </button>
      </div>

      {/* ── DEMO TIP ──────────────────────────────────────────────────────── */}
      <DemoTip dark />

      {/* ── SESSION HISTORY ────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="mx-4 mt-4 bg-gray-900 rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">This Session</p>
          <div className="space-y-2">
            {history.map((h, i) => {
              const c = verdictConfig[h.verdict] || verdictConfig.ERROR;
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm">{c.icon}</span>
                  <p className="text-gray-300 text-xs flex-1 truncate">{h.products_detected?.[0] || 'Product'}</p>
                  <span className="text-[10px] font-black" style={{ color: c.color }}>{c.label}</span>
                  <span className="text-[9px] text-gray-500">{h.timestamp}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <BottomNav active="scan" />
    </div>
  );
}