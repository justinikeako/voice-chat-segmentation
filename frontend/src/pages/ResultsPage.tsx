/* eslint-disable react-hooks/rules-of-hooks */
// frontend/src/pages/ResultsPage.tsx
// Full upgrade: Amazon live products, scan product, weekly check CTA,
// conversation feed from ScanPage, natural remedies tab, scan product modal
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DemoTip } from "./HomePage";

const getApiUrl = () => {
  const saved = localStorage.getItem("VITE_API_URL");
  if (saved) return saved;
  const env = process.env.REACT_APP_API_URL;
  if (env) return env;
  if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") return window.location.origin;
  return "http://127.0.0.1:5000";
};

type ChatMessage = { role: "user" | "assistant" | string; content: string };
type TabId = "care" | "products" | "remedies" | "chat" | "ai";

interface ScanResultData {
  hair_group?: string;
  hair_type_confirmed?: string;
  exact_subtype?: string;
  hair_subtype?: string;
  porosity?: string;
  texture?: string;
  curl_pattern?: string;
  scalp_score?: number;
  scalp_condition?: string;
  care_recommendations?: string[];
  ingredients_to_seek?: string[];
  ingredients_to_avoid?: string[];
  debug_metrics?: Record<string, unknown>;
}

interface ResultsLocationState {
  data?: ScanResultData;
  chatHistory?: ChatMessage[];
}

interface Product {
  name: string;
  brand?: string;
  price?: string;
  rating?: string | number;
  category?: string;
  amazon_url?: string;
  badge?: string | null;
  image?: string;
  reason?: string;
  store_description?: string;
  prime?: boolean;
  products_detected?: string[];
  confidence?: number;
}

interface Remedy {
  emoji: string;
  name: string;
  benefit: string;
  ingredients?: string[];
  steps: string;
}

interface ProductScanResult {
  verdict: string;
  reason?: string;
  products_detected?: string[];
  confidence?: number;
}

// ─── Colour themes ────────────────────────────────────────────────────────────
const HAIR_TYPE_COLORS: Record<
  string,
  { bg: string; accent: string; light: string }
> = {
  Straight: { bg: '#1E3A5F', accent: '#6B9FD4', light: '#A8C8F0' },
  Wavy:     { bg: '#1A3D2B', accent: '#82C882', light: '#AADAAA' },
  Curly:    { bg: '#3D2A10', accent: '#E8A84A', light: '#F5D090' },
  Coily:    { bg: '#3D1010', accent: '#C06B6B', light: '#E8A0A0' },
};

const SCALP_LABELS: Record<string, { emoji: string; color: string }> = {
  Healthy:  { emoji: '✅', color: '#4CAF50' },
  Dry:      { emoji: '🌵', color: '#FF9800' },
  Oily:     { emoji: '💧', color: '#2196F3' },
  Buildup:  { emoji: '⚠️', color: '#FF5722' },
  Thinning: { emoji: '🔍', color: '#9C27B0' },
};

// ─── Fallback static products (shown when API offline) ────────────────────────
const FALLBACK_PRODUCTS = {
  Coily: [
    { name: 'SheaMoisture Manuka Honey Masque', brand: 'SheaMoisture', price: '$14.97', rating: '4.7', category: 'Deep Conditioner', amazon_url: 'https://www.amazon.com/dp/B01LYARQG0', badge: '🏆 Best for 4C', image: '', reason: 'Deep moisture for tight coils', store_description: 'Ask for SheaMoisture Manuka Honey deep conditioner — dark brown jar. Perfect for 4C coils that need intense moisture.' },
    { name: 'Mielle Organics Rosemary Mint Oil', brand: 'Mielle', price: '$10.99', rating: '4.8', category: 'Scalp Oil', amazon_url: 'https://www.amazon.com/dp/B08CJMS7D3', badge: '🔥 Viral Pick', image: '', reason: 'Promotes scalp health and growth', store_description: 'Ask for Mielle Rosemary Mint scalp oil — small dark bottle with red label. Hugely popular for growth.' },
    { name: 'Aunt Jackie\'s Curl La La Custard', brand: 'Aunt Jackie\'s', price: '$9.99', rating: '4.5', category: 'Curl Definer', amazon_url: 'https://www.amazon.com/dp/B004FECWAO', badge: null, image: '', reason: 'Defines and moisturises coily strands', store_description: 'Ask for Aunt Jackie\'s curl custard — purple tub. Great for definition without crunch.' },
    { name: 'TGIN Butter Cream Daily Moisturizer', brand: 'TGIN', price: '$12.99', rating: '4.6', category: 'Leave-In', amazon_url: 'https://www.amazon.com/dp/B01D6K6HGW', badge: null, image: '', reason: 'Daily moisture retention', store_description: 'Ask for TGIN (Thank God It\'s Natural) butter cream moisturizer. Green packaging.' },
  ],
  Curly: [
    { name: 'DevaCurl SuperCream Coconut Styler', brand: 'DevaCurl', price: '$28.00', rating: '4.5', category: 'Curl Styler', amazon_url: 'https://www.amazon.com/dp/B007X5QDZU', badge: '🏆 Best 3A-3C', image: '', reason: 'Enhances curl definition without frizz', store_description: 'Ask for DevaCurl SuperCream. It\'s a white cream in a white bottle. Sulfate-free.' },
    { name: 'SheaMoisture Coconut Curl Enhancer', brand: 'SheaMoisture', price: '$11.99', rating: '4.6', category: 'Curl Enhancer', amazon_url: 'https://www.amazon.com/dp/B07BVNMS9V', badge: null, image: '', reason: 'Coconut milk smooths curly patterns', store_description: 'Ask for SheaMoisture Coconut and Hibiscus curl enhancing smoothie. Pink/white packaging.' },
  ],
  Wavy: [
    { name: 'Not Your Mother\'s Curl Talk Cream', brand: 'NYM', price: '$8.99', rating: '4.5', category: 'Curl Definer', amazon_url: 'https://www.amazon.com/dp/B08CX8ZQSC', badge: '🏆 Best 2A-2C', image: '', reason: 'Lightweight definition for waves', store_description: 'Ask for Not Your Mother\'s Curl Talk defining cream. Yellow and white bottle.' },
    { name: 'OGX Coconut Curls Shampoo', brand: 'OGX', price: '$7.97', rating: '4.6', category: 'Shampoo', amazon_url: 'https://www.amazon.com/dp/B0052PA4T8', badge: null, image: '', reason: 'Gentle cleanse for wavy hair', store_description: 'Ask for OGX Coconut Curls shampoo — brown/gold bottle. Sulfate-free, great for waves.' },
  ],
  Straight: [
    { name: 'Moroccanoil Treatment Original', brand: 'Moroccanoil', price: '$44.00', rating: '4.8', category: 'Hair Oil', amazon_url: 'https://www.amazon.com/dp/B00CGGKLRM', badge: '🔥 Viral Pick', image: '', reason: 'Adds shine and smoothness to straight hair', store_description: 'Ask for Moroccanoil argan oil treatment — gold and brown bottle. A few drops go on damp hair before styling.' },
    { name: 'TRESemmé Keratin Smooth Shampoo', brand: 'TRESemmé', price: '$6.94', rating: '4.5', category: 'Shampoo', amazon_url: 'https://www.amazon.com/dp/B0049X5MHQ', badge: '🏆 Best Seller', image: '', reason: 'Keratin smooths and straightens', store_description: 'Ask for TRESemmé Keratin Smooth shampoo. Black bottle, easy to find in any pharmacy.' },
  ],
};

// ─── Star rating ──────────────────────────────────────────────────────────────
function StarRating({ rating }: { rating: string | number }) {
  const r = typeof rating === "number" ? rating : parseFloat(rating) || 0;
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <svg key={i} className={`w-3 h-3 ${i <= Math.round(r) ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-gray-400 text-[10px] ml-0.5">{rating}</span>
    </span>
  );
}

// ─── Scan Product Modal ───────────────────────────────────────────────────────
function ScanProductModal({
  hairType,
  hairProfile,
  onClose,
}: {
  hairType: string;
  hairProfile: string;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn]   = useState(false);
  const [scanning, setScanning]   = useState(false);
  const [result, setResult]       = useState<ProductScanResult | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        setCameraOn(true);
      } catch { alert('Camera needed to scan products.'); onClose(); }
    })();
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const doScan = async () => {
    if (!videoRef.current || !canvasRef.current || scanning) return;
    setScanning(true);
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    const dataUrl = c.toDataURL('image/jpeg', 0.85);
    try {
      const res = await fetch(`${getApiUrl()}/api/marketplace/scan-product`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, hair_type: hairType, hair_profile: hairProfile }),
      });
      const json = (await res.json()) as ProductScanResult;
      setResult(json);
    } catch { setResult({ verdict: 'ERROR', reason: 'Could not connect — check your network.' }); }
    finally { setScanning(false); }
  };

  const verdict = result?.verdict ?? 'ERROR';
  const verdictConfig: Record<string, { color: string; icon: string; label: string }> = {
    GOOD:  { color: '#22c55e', icon: '✅', label: 'Great for your hair!' },
    BAD:   { color: '#ef4444', icon: '❌', label: 'Not recommended' },
    OK:    { color: '#f59e0b', icon: '⚠️', label: 'Use with caution' },
    ERROR: { color: '#6b7280', icon: '⚡', label: 'Try again' },
  };
  const vc = verdictConfig[verdict] || verdictConfig.ERROR;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <div>
          <p className="text-sky-400 text-[10px] font-black tracking-widest uppercase">In-Store Mode</p>
          <p className="text-white text-base font-black">Scan a Product</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">✕</button>
      </div>

      <div className="flex-1 mx-4 rounded-2xl overflow-hidden relative bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        {!result && !scanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-sky-400/60 rounded-xl w-3/4 h-3/5" />
            <p className="absolute bottom-6 text-sky-300 text-xs font-bold tracking-widest uppercase animate-pulse">Point at product label</p>
          </div>
        )}
        {scanning && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
            <p className="text-white text-sm font-bold">Kera is reading the label…</p>
          </div>
        )}
        {result && (
          <div className="absolute inset-x-0 bottom-0 bg-white/95 backdrop-blur p-4 rounded-t-2xl">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{vc.icon}</span>
              <p className="font-black text-gray-900">{vc.label}</p>
              {result.confidence && <span className="ml-auto font-black text-sm" style={{ color: vc.color }}>{result.confidence}%</span>}
            </div>
            <p className="text-sm text-gray-700">{result.reason}</p>
            {result.products_detected?.[0] && <p className="text-xs text-gray-400 mt-1 italic">{result.products_detected.join(', ')}</p>}
            <button onClick={() => setResult(null)} className="mt-3 w-full py-2 border border-gray-200 rounded-xl text-xs font-black text-gray-500">
              Scan Another
            </button>
          </div>
        )}
      </div>

      <div className="px-4 py-4">
        <button onClick={doScan} disabled={scanning || !cameraOn}
          className="w-full py-4 rounded-2xl text-sm font-black tracking-wider uppercase disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#0ea5e9,#60a5fa)', color: 'white' }}>
          {scanning ? 'Analysing…' : '🔍 Scan This Product'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ResultsPage() {
  const location = useLocation() as { state?: ResultsLocationState };
  const navigate = useNavigate();
  const data = location.state?.data;

  // Conversation history passed from ScanPage
  const chatHistory: ChatMessage[] = location.state?.chatHistory || [];

  const [activeTab, setActiveTab]           = useState<TabId>('care');
  const [products, setProducts]             = useState<Product[]>([]);
  const [remedies, setRemedies]             = useState<Remedy[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSource, setProductSource]   = useState('');
  const [storeDescOpen, setStoreDescOpen]   = useState<number | null>(null);
  const [showScanProduct, setShowScanProduct] = useState(false);

  // ── Hooks must be above any early return ─────────────────────────────────
  const hairGroup_  = data?.hair_group || data?.hair_type_confirmed || 'Coily';
  const hairSubtype_ = data?.exact_subtype || data?.hair_subtype || hairGroup_;

  // Store hair type for in-store mode and shop
  useEffect(() => {
    if (hairSubtype_) localStorage.setItem('kera_hair_type', hairSubtype_);
  }, [hairSubtype_]);

  // Load live Amazon products when products tab is active
  useEffect(() => {
    if (!data || activeTab !== 'products') return;
    if (products.length > 0) return;
    setProductsLoading(true);
    fetch(`${getApiUrl()}/api/marketplace/products?hair_type=${hairSubtype_}`)
      .then(r => r.json())
      .then(d => { setProducts(d.products || []); setProductSource(d.source || 'local'); setProductsLoading(false); })
      .catch(() => {
        setProducts(FALLBACK_PRODUCTS[hairGroup_ as keyof typeof FALLBACK_PRODUCTS] || FALLBACK_PRODUCTS.Coily);
        setProductSource('offline');
        setProductsLoading(false);
      });
  }, [activeTab, data, hairSubtype_, hairGroup_]);

  // Load remedies when that tab is active
  useEffect(() => {
    if (!data || activeTab !== 'remedies') return;
    if (remedies.length > 0) return;
    fetch(`${getApiUrl()}/api/marketplace/remedies?hair_type=${hairSubtype_}`)
      .then(r => r.json())
      .then(d => setRemedies(d.remedies || []))
      .catch(() => {});
  }, [activeTab, data, hairSubtype_]);

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">No scan data found</h2>
        <p className="text-gray-500 text-sm text-center mb-6">Complete a hair scan to see your personalised results.</p>
        <button onClick={() => navigate('/scan')} className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold text-sm tracking-wide">Start a Scan</button>
      </div>
    );
  }

  const hairGroup   = data.hair_group || data.hair_type_confirmed || 'Coily';
  const hairSubtype = data.exact_subtype || data.hair_subtype || hairGroup;
  const porosity    = data.porosity || '—';
  const texture     = data.texture || '—';
  const curlPattern = data.curl_pattern || '';
  const scalpScore  = data.scalp_score || 0;
  const scalpCond   = data.scalp_condition || 'Healthy';
  const careRecs    = data.care_recommendations || [];
  const seekList    = data.ingredients_to_seek || [];
  const avoidList   = data.ingredients_to_avoid || [];
  const debug       = (data.debug_metrics || {}) as any;

  const theme     = HAIR_TYPE_COLORS[hairGroup] || HAIR_TYPE_COLORS.Coily;
  const scalpInfo = SCALP_LABELS[scalpCond]     || SCALP_LABELS.Healthy;
  const cvConf    = Math.round((debug.custom_vision_conf || 0) * 100);
  const mnConf    = Math.round((debug.mobilenet_conf || 0) * 100);
  const scalpPct  = (scalpScore / 10) * 100;
  const scalpBarColor = scalpScore >= 7 ? '#4CAF50' : scalpScore >= 4 ? '#FF9800' : '#F44336';

  const hairProfile = JSON.stringify({ porosity, texture, scalp: scalpCond });

  const TABS: { id: TabId; label: string }[] = [
    { id: 'care',     label: '💆 Care' },
    { id: 'products', label: '🛍️ Shop' },
    { id: 'remedies', label: '🌿 Remedies' },
    { id: 'chat',     label: '💬 Chat' },
    { id: 'ai',       label: '🤖 AI' },
  ];

  return (
    <div className="min-h-screen bg-[#F4F2EE] pb-28">

      {showScanProduct && (
        <ScanProductModal
          hairType={hairSubtype}
          hairProfile={hairProfile}
          onClose={() => setShowScanProduct(false)}
        />
      )}

      {/* ── HERO HEADER ── */}
      <div className="relative px-6 pt-14 pb-8 overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${theme.bg} 0%, #1A1A1A 100%)` }}>

        <button onClick={() => navigate('/scan')}
          className="absolute top-5 left-5 text-white/60 hover:text-white flex items-center gap-1 text-sm font-semibold tracking-widest uppercase">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          New Scan
        </button>

        {/* Top-right actions */}
        <div className="absolute top-4 right-5 flex items-center gap-2">
          {/* Scan Product button */}
          <button onClick={() => setShowScanProduct(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-black tracking-widest uppercase border border-sky-400/40 text-sky-300 hover:bg-sky-400/10">
            🔍 Scan Product
          </button>
          <button onClick={() => navigate('/chat', { state: { data } })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-black tracking-widest uppercase border border-white/20 text-white hover:bg-white/10"
            style={{ borderColor: theme.accent + '60' }}>
            <span style={{ color: theme.accent }}>Ask Kera</span>
          </button>
        </div>

        {/* Hair type heading */}
        <div className="flex items-end gap-4 mt-4">
          <div>
            <p className="text-white/40 text-xs font-bold tracking-[0.2em] uppercase mb-1">Hair Type</p>
            <div className="flex items-baseline gap-2">
              <h1 className="text-5xl font-black text-white leading-none">{hairSubtype}</h1>
              <span className="text-lg font-bold" style={{ color: theme.accent }}>{hairGroup}</span>
            </div>
          </div>
        </div>

        {/* Pills */}
        <div className="flex flex-wrap gap-2 mt-5">
          {[
            { label: 'Porosity', value: porosity },
            { label: 'Texture',  value: texture },
            { label: 'Scalp',    value: scalpCond },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 flex items-center gap-2">
              <span className="text-white/50 text-[10px] font-bold uppercase tracking-wider">{label}</span>
              <span className="text-white text-xs font-black capitalize">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── QUICK ACTION CARDS ── */}
      <div className="px-4 -mt-3 mb-4 grid grid-cols-3 gap-2">
        {[
          { emoji: '📊', label: 'Weekly Check', color: '#8b5cf6', bg: '#f5f3ff', action: () => navigate('/weekly', { state: { data } }) },
          { emoji: '🛍️', label: 'Shop Now',     color: '#10b981', bg: '#ecfdf5', action: () => { setActiveTab('products'); } },
          { emoji: '🔍', label: 'Scan Product', color: '#0ea5e9', bg: '#ecfeff', action: () => setShowScanProduct(true) },
        ].map(card => (
          <button key={card.label} onClick={card.action}
            className="rounded-2xl p-3 text-center shadow-sm active:scale-95 transition-transform"
            style={{ backgroundColor: card.bg }}>
            <p className="text-xl">{card.emoji}</p>
            <p className="text-xs font-black mt-1" style={{ color: card.color }}>{card.label}</p>
          </button>
        ))}
      </div>

      {/* ── SCALP SCORE ── */}
      <div className="mx-4 bg-white rounded-2xl shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{scalpInfo.emoji}</span>
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Scalp Health Score</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-gray-900">{scalpScore}</span>
            <span className="text-sm text-gray-400 font-bold">/10</span>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${scalpPct}%`, backgroundColor: scalpBarColor }} />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {scalpScore >= 7 ? 'Great scalp health — keep it up!' : scalpScore >= 4 ? 'Some scalp attention recommended.' : 'Scalp needs care — see recommendations below.'}
        </p>
      </div>

      {/* ── CURL PATTERN ── */}
      {curlPattern && (
        <div className="mx-4 bg-white rounded-2xl shadow-sm p-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🌀</span>
            <span className="text-xs font-black uppercase tracking-widest text-gray-500">Curl Pattern</span>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">{curlPattern}</p>
        </div>
      )}

      {/* ── TABS ── */}
      <div className="mx-4 mb-4">
        <div className="flex bg-white rounded-2xl shadow-sm p-1 gap-0.5 overflow-x-auto no-scrollbar">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-3 py-2.5 rounded-xl text-[11px] font-black tracking-wide transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CARE TAB ── */}
      {activeTab === 'care' && (
        <div className="mx-4 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">✨</span>
              <span className="text-xs font-black uppercase tracking-widest text-gray-500">Care Recommendations</span>
            </div>
            <div className="space-y-3">
              {careRecs.map((tip, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: theme.accent }}>{i + 1}</div>
                  <p className="text-gray-700 text-sm leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🧪</span>
              <span className="text-xs font-black uppercase tracking-widest text-gray-500">Ingredients</span>
            </div>
            <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600 mb-2">✅ Look For</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {seekList.map((ing, i) => (
                <span key={i} className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full capitalize">{ing}</span>
              ))}
            </div>
            <p className="text-[11px] font-black uppercase tracking-widest text-red-500 mb-2">❌ Avoid</p>
            <div className="flex flex-wrap gap-2">
              {avoidList.map((ing, i) => (
                <span key={i} className="bg-red-50 text-red-600 border border-red-200 text-xs font-bold px-3 py-1 rounded-full capitalize">{ing}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PRODUCTS TAB ── */}
      {activeTab === 'products' && (
        <div className="mx-4 space-y-3">
          {/* Source indicator */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${
            productSource === 'amazon' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-500'
          }`}>
            {productSource === 'amazon' ? '🟢 Live Amazon results' : productSource === 'offline' ? '📦 Offline — showing local picks' : '📦 Local database'}
          </div>

          {productsLoading && (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white rounded-2xl shadow-sm p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                      <div className="h-3 bg-gray-100 rounded w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!productsLoading && products.map((p, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 flex gap-3">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-16 h-16 object-contain rounded-xl bg-gray-50 flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${theme.bg}40, ${theme.accent}30)` }}>
                    🧴
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-sm font-black text-gray-900 leading-tight line-clamp-2">{p.name}</p>
                    {p.badge && (
                      <span className="text-[9px] font-black bg-gray-900 text-white px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">{p.badge}</span>
                    )}
                  </div>
                  {p.brand && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">{p.brand}{p.category ? ` · ${p.category}` : ''}</p>}
                  <div className="flex items-center justify-between mt-1.5">
                    {p.rating && <StarRating rating={p.rating} />}
                    {p.price && p.price !== 'N/A' && (
                      <span className="text-sm font-black text-gray-900">{p.price}</span>
                    )}
                    {p.prime && <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">PRIME</span>}
                  </div>
                </div>
              </div>

              {p.reason && (
                <div className="px-4 py-2 border-t border-gray-50 text-xs text-gray-500">{p.reason}</div>
              )}

              <div className="px-4 pb-4 flex gap-2 pt-2">
                {p.amazon_url && (
                  <a href={p.amazon_url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-2.5 rounded-xl text-xs font-black text-center tracking-wider active:opacity-80"
                    style={{ background: `linear-gradient(135deg, ${theme.bg}, ${theme.accent}90)`, color: 'white' }}>
                    Buy on Amazon ↗
                  </a>
                )}
                <button onClick={() => setStoreDescOpen(storeDescOpen === i ? null : i)}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-black text-gray-600">
                  🏪 Local
                </button>
              </div>

              {storeDescOpen === i && p.store_description && (
                <div className="mx-4 mb-4 bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-green-700 mb-1">📋 Show to store assistant:</p>
                  <p className="text-green-900 text-xs leading-relaxed">{p.store_description}</p>
                  <button onClick={() => navigator.clipboard?.writeText(p.store_description ?? "")}
                    className="mt-2 text-[10px] font-black text-green-600 border border-green-300 px-2 py-1 rounded-lg">
                    Copy
                  </button>
                </div>
              )}
            </div>
          ))}

          <button onClick={() => navigate('/instore', { state: { data } })}
            className="w-full py-3 border border-sky-200 rounded-2xl text-sm font-black text-sky-600 bg-sky-50">
            🔍 Open In-Store Mode — Scan a shelf
          </button>
        </div>
      )}

      {/* ── REMEDIES TAB ── */}
      {activeTab === 'remedies' && (
        <div className="mx-4 space-y-4">
          <div className="bg-lime-50 border border-lime-200 rounded-2xl p-3">
            <p className="text-lime-800 text-xs font-semibold">
              🌿 Natural DIY recipes for <strong>{hairSubtype}</strong> hair — all from your local supermarket.
            </p>
          </div>
          {remedies.length === 0 && (
            <div className="text-center text-gray-400 py-6 text-sm">Loading remedies…</div>
          )}
          {remedies.map((r, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{r.emoji}</span>
                <div>
                  <p className="font-black text-gray-900 text-sm">{r.name}</p>
                  <p className="text-[11px] text-emerald-600 font-semibold">{r.benefit}</p>
                </div>
              </div>
              <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2">Ingredients</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {r.ingredients?.map((ing, j) => (
                  <span key={j} className="bg-lime-50 border border-lime-200 text-lime-800 text-[11px] font-semibold px-2.5 py-1 rounded-full">{ing}</span>
                ))}
              </div>
              <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-1">Method</p>
              <p className="text-sm text-gray-600 leading-relaxed">{r.steps}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── CHAT HISTORY TAB ── */}
      {activeTab === 'chat' && (
        <div className="mx-4 space-y-3">
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Conversation from scan session</p>
            <p className="text-gray-400 text-xs">Everything you asked Kera during your hair scan.</p>
          </div>
          {chatHistory.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-3xl mb-2">💬</p>
              <p className="text-sm font-semibold">No conversation yet</p>
              <p className="text-xs">Ask Kera questions during your next scan — they'll appear here.</p>
              <button onClick={() => navigate('/scan')}
                className="mt-4 px-6 py-2.5 bg-gray-900 text-white rounded-2xl text-xs font-black tracking-wider">
                Start a Scan
              </button>
            </div>
          )}
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-gray-900 text-white rounded-br-sm'
                  : 'bg-white shadow-sm text-gray-800 rounded-bl-sm'
              }`}>
                {msg.role === 'assistant' && (
                  <p className="text-[9px] font-black tracking-widest text-amber-500 uppercase mb-1">Kera AI</p>
                )}
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          <button onClick={() => navigate('/chat', { state: { data } })}
            className="w-full py-3 border-2 rounded-2xl text-sm font-black tracking-wider text-center"
            style={{ borderColor: theme.accent, color: theme.accent }}>
            💬 Continue Chatting with Kera
          </button>
        </div>
      )}

      {/* ── AI DATA TAB ── */}
      {activeTab === 'ai' && (
        <div className="mx-4 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🤖</span>
              <span className="text-xs font-black uppercase tracking-widest text-gray-500">AI Model Confidence</span>
            </div>
            {[
              { label: 'Azure Custom Vision', pred: debug.custom_vision_pred, conf: cvConf, color: theme.accent },
              { label: 'MobileNetV3 (Local)',  pred: debug.mobilenet_pred,    conf: mnConf, color: '#a78bfa' },
            ].map(m => (
              <div key={m.label} className="mb-4">
                <div className="flex justify-between items-center mb-1.5">
                  <p className="text-xs font-bold text-gray-600">{m.label}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-gray-900">{m.pred}</span>
                    <span className="text-xs font-black" style={{ color: m.color }}>{m.conf}%</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${m.conf}%`, backgroundColor: m.color }} />
                </div>
              </div>
            ))}
            <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between border border-gray-100">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">GPT‑5 Discriminator</p>
                <p className="text-sm font-black text-gray-900 mt-0.5">{debug.discriminator_resolved || hairGroup}</p>
              </div>
              <div className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-2xl p-5 text-white">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Pipeline</p>
            {[
              { n: '01', name: 'Azure Custom Vision',  desc: 'CNN trained on 4-class dataset' },
              { n: '02', name: 'MobileNetV3 (Local)',   desc: 'PyTorch model, 87.1% val accuracy' },
              { n: '03', name: 'GPT-5 Discriminator',   desc: 'Resolves CNN conflicts via vision' },
              { n: '04', name: 'GPT-5 Care Agent',      desc: 'Generates personalised JSON profile' },
            ].map(({ n, name, desc }) => (
              <div key={n} className="flex items-start gap-3 mb-2">
                <span className="text-[10px] font-black text-gray-600 w-5 flex-shrink-0">{n}</span>
                <div>
                  <p className="text-xs font-black text-white">{name}</p>
                  <p className="text-[10px] text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DemoTip />

      {/* ── BOTTOM CTA ── */}
      <div className="mx-4 mt-6 space-y-3">
        {/* Weekly check CTA */}
        <button onClick={() => navigate('/weekly', { state: { data } })}
          className="w-full py-4 rounded-2xl font-black text-sm tracking-widest uppercase text-white flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg,#8b5cf6,#a78bfa)' }}>
          📊 Log Weekly Check
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/scan')}
            className="py-4 bg-gray-900 text-white rounded-2xl font-black text-xs tracking-widest uppercase">
            New Scan
          </button>
          <button onClick={() => navigate('/chat', { state: { data } })}
            className="py-4 rounded-2xl font-black text-xs tracking-widest uppercase border-2"
            style={{ borderColor: theme.accent, color: theme.accent }}>
            💬 Ask Kera
          </button>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
