// frontend/src/pages/ShopPage.jsx
// Amazon product search (RapidAPI) + local fallback + natural remedies + store finder
import { useState, useEffect } from 'react';
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

type ShopTab = 'amazon' | 'remedies' | 'stores';
type Category = 'All' | 'Shampoo' | 'Conditioner' | 'Oil' | 'Styler';

interface ShopScanData {
  exact_subtype?: string;
  hair_type?: string;
}

interface Product {
  name?: string;
  brand?: string;
  reason?: string;
  image?: string;
  price?: string;
  rating?: string | number;
  prime?: boolean;
  amazon_url?: string;
  store_description?: string;
}

interface Remedy {
  emoji?: string;
  name?: string;
  benefit?: string;
  ingredients: string[];
  steps?: string;
}

interface Store {
  type?: string;
  name?: string;
  verified?: boolean;
  location?: string;
  phone?: string;
  website?: string;
}

const CATEGORIES: Category[] = ['All', 'Shampoo', 'Conditioner', 'Oil', 'Styler'];
const TABS: { id: ShopTab; label: string }[] = [
  { id: 'amazon', label: '🛍️ Amazon' },
  { id: 'remedies', label: '🌿 Remedies' },
  { id: 'stores', label: '📍 Stores' },
];

export default function ShopPage() {
  const navigate  = useNavigate();
  const location = useLocation() as { state?: { data?: ShopScanData } };
  const passedData = location.state?.data;

  const hairType = passedData?.exact_subtype || passedData?.hair_type
    || localStorage.getItem('kera_hair_type') || '4C';

  const [tab, setTab] = useState<ShopTab>('amazon');
  const [category, setCategory] = useState<Category>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [remedies, setRemedies] = useState<Remedy[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading]     = useState(false);
  const [source, setSource]       = useState('');
  const [storeDesc, setStoreDesc] = useState<number | null>(null); // product whose local description is shown

  // ── Load products ─────────────────────────────────────────────────────────
  const loadProducts = (cat: Category) => {
    setLoading(true);
    const params = new URLSearchParams({ hair_type: hairType });
    if (cat && cat !== 'All') params.append('category', cat);
    fetch(`${getApiUrl()}/api/marketplace/products?${params}`)
      .then(r => r.json())
      .then(d => { setProducts(d.products || []); setSource(d.source); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const loadRemedies = () => {
    setLoading(true);
    fetch(`${getApiUrl()}/api/marketplace/remedies?hair_type=${hairType}`)
      .then(r => r.json())
      .then(d => { setRemedies(d.remedies || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const loadStores = () => {
    setLoading(true);
    fetch(`${getApiUrl()}/api/marketplace/local-stores`)
      .then(r => r.json())
      .then(d => { setStores(d.stores || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (tab === 'amazon')   loadProducts(category);
    if (tab === 'remedies') loadRemedies();
    if (tab === 'stores')   loadStores();
  }, [tab, category]);

  // Save hair type for next time
  useEffect(() => {
    if (hairType) localStorage.setItem('kera_hair_type', hairType);
  }, [hairType]);

  return (
    <div className="min-h-screen bg-[#F4F2EE] pb-28">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="bg-[#1A1A1A] px-6 pt-14 pb-5">
        <button onClick={() => navigate('/')} className="text-gray-400 text-sm flex items-center gap-1 mb-3 font-semibold">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-400 text-[10px] font-black tracking-[0.3em] uppercase">Products</p>
            <h1 className="text-2xl font-black text-white">Shop for <span className="text-emerald-400">{hairType}</span></h1>
          </div>
          <button
            onClick={() => navigate('/instore', { state: { data: passedData } })}
            className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-black tracking-wider"
          >
            🔍 In-Store
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black tracking-wider transition-colors ${
                tab === t.id ? 'bg-emerald-500 text-white' : 'bg-white/10 text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── AMAZON TAB ─────────────────────────────────────────────────────── */}
      {tab === 'amazon' && (
        <div className="px-4 pt-4 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 shadow-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-black tracking-wider transition-colors ${
                  category === c ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 shadow-sm'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Source badge */}
          {source && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${
              source === 'amazon' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-600'
            }`}>
              {source === 'amazon' ? '🟢 Live Amazon results' : '📦 Local database results'}
              {source !== 'amazon' && <span className="text-gray-400">— offline / API unavailable</span>}
            </div>
          )}

          {loading && (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white rounded-2xl shadow-sm p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                      <div className="h-3 bg-gray-100 rounded w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && products.filter((p) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (p.name || '').toLowerCase().includes(q) ||
                   (p.brand || '').toLowerCase().includes(q) ||
                   (p.reason || '').toLowerCase().includes(q);
          }).map((p, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 flex gap-3">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-16 h-16 object-contain rounded-xl bg-gray-50 flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-green-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🧴</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900 leading-tight line-clamp-2">{p.name}</p>
                  {p.brand && <p className="text-[11px] text-gray-400 font-semibold mt-0.5">{p.brand}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    {p.price && p.price !== 'N/A' && (
                      <span className="text-sm font-black text-emerald-600">{p.price}</span>
                    )}
                    {p.rating && (
                      <span className="text-[10px] text-amber-500 font-bold">⭐ {p.rating}</span>
                    )}
                    {p.prime && (
                      <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">PRIME</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-4 pb-3 text-xs text-gray-500 leading-relaxed border-t border-gray-50 pt-2">
                {p.reason}
              </div>

              <div className="px-4 pb-4 flex gap-2">
                {p.amazon_url && (
                  <a href={p.amazon_url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-2.5 bg-amber-400 text-black rounded-xl text-xs font-black text-center tracking-wider active:opacity-80">
                    Buy on Amazon ↗
                  </a>
                )}
                <button
                  onClick={() => setStoreDesc(storeDesc === i ? null : i)}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-black text-gray-600 active:bg-gray-50"
                >
                  🏪 Local
                </button>
              </div>

              {/* Local store description */}
              {storeDesc === i && (
                <div className="mx-4 mb-4 bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-green-700 mb-1">📋 Show this to a store assistant:</p>
                  <p className="text-green-900 text-xs leading-relaxed">{p.store_description}</p>
                  <button
                    onClick={() => navigator.clipboard?.writeText(p.store_description ?? '')}
                    className="mt-2 text-[10px] font-black text-green-600 border border-green-300 px-2 py-1 rounded-lg"
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── REMEDIES TAB ───────────────────────────────────────────────────── */}
      {tab === 'remedies' && (
        <div className="px-4 pt-4 space-y-4">
          <div className="bg-lime-50 border border-lime-200 rounded-2xl p-3">
            <p className="text-lime-800 text-xs font-semibold">
              🌿 Natural DIY recipes tailored for <strong>{hairType}</strong> hair. Made from ingredients you can find at any supermarket or local market.
            </p>
          </div>
          {loading && <p className="text-center text-gray-400 py-6">Loading…</p>}
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
                {r.ingredients.map((ing: string, j: number) => (
                  <span key={j} className="bg-lime-50 border border-lime-200 text-lime-800 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                    {ing}
                  </span>
                ))}
              </div>
              <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-1">Method</p>
              <p className="text-sm text-gray-600 leading-relaxed">{r.steps}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── STORES TAB ─────────────────────────────────────────────────────── */}
      {tab === 'stores' && (
        <div className="px-4 pt-4 space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
            <p className="text-blue-800 text-xs font-semibold">
              📍 Local Jamaican hair & beauty stores that stock products for your hair type.
            </p>
          </div>
          {loading && <p className="text-center text-gray-400 py-6">Loading…</p>}
          {stores.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-lg flex-shrink-0">
                  {s.type === 'Pharmacy' ? '💊' : s.type === 'Natural Beauty' ? '🌿' : '🏪'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-gray-900 text-sm">{s.name}</p>
                    {s.verified && (
                      <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">✓ Verified</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{s.location} · {s.type}</p>
                  {s.phone && <p className="text-xs text-blue-600 font-semibold mt-1">{s.phone}</p>}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {s.phone && (
                  <a href={`tel:${s.phone}`}
                    className="flex-1 py-2 border border-gray-200 rounded-xl text-xs font-black text-center text-gray-600">
                    📞 Call
                  </a>
                )}
                {s.website && (
                  <a href={s.website} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-2 border border-gray-200 rounded-xl text-xs font-black text-center text-blue-600">
                    🌐 Website
                  </a>
                )}
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(s.name + ' ' + s.location)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-2 bg-gray-900 rounded-xl text-xs font-black text-center text-white">
                  🗺️ Map
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <DemoTip />

      <BottomNav active="shop" />
    </div>
  );
}