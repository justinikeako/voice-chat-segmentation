import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const BASIC_PRODUCTS = {
  Coily: [
    { name: 'SheaMoisture Manuka Honey Masque', brand: 'SheaMoisture', category: 'Deep Conditioner' },
    { name: 'Mielle Organics Rosemary Mint Oil', brand: 'Mielle', category: 'Scalp Oil' },
    { name: "Aunt Jackie's Curl La La Custard", brand: "Aunt Jackie's", category: 'Curl Definer' },
  ],
  Curly: [
    { name: 'DevaCurl SuperCream Coconut Styler', brand: 'DevaCurl', category: 'Curl Styler' },
    { name: 'SheaMoisture Coconut Curl Enhancer', brand: 'SheaMoisture', category: 'Curl Enhancer' },
  ],
  Wavy: [
    { name: "Not Your Mother's Curl Talk Cream", brand: 'NYM', category: 'Curl Definer' },
    { name: 'OGX Coconut Curls Shampoo', brand: 'OGX', category: 'Shampoo' },
  ],
  Straight: [
    { name: 'Moroccanoil Treatment Original', brand: 'Moroccanoil', category: 'Hair Oil' },
    { name: "TRESemm\u00E9 Keratin Smooth Shampoo", brand: "TRESemm\u00E9", category: 'Shampoo' },
  ],
};

export default function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state?.data;
  const [tab, setTab] = useState('care');

  if (!data) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center p-8">
        <p className="text-4xl mb-4">{"\uD83D\uDD0D"}</p>
        <p className="text-gray-600 font-bold mb-4">No scan data</p>
        <button onClick={() => navigate('/scan')} className="bg-kera-dark text-white px-6 py-3 rounded-xl font-bold text-sm">Start a Scan</button>
      </div>
    );
  }

  const hairGroup = data.hair_group || data.hair_type_confirmed || 'Coily';
  const hairSubtype = data.exact_subtype || data.hair_subtype || hairGroup;
  const porosity = data.porosity || '\u2014';
  const texture = data.texture || '\u2014';
  const scalpScore = data.scalp_score || 0;
  const scalpCond = data.scalp_condition || 'Healthy';
  const careRecs = data.care_recommendations || [];
  const seekList = data.ingredients_to_seek || [];
  const avoidList = data.ingredients_to_avoid || [];
  const curlPattern = data.curl_pattern || '';

  const groupColors = { Straight: '#6B9FD4', Wavy: '#82C882', Curly: '#E8A84A', Coily: '#C06B6B' };
  const accent = groupColors[hairGroup] || '#D4AF37';
  const scalpColor = scalpScore >= 7 ? '#4CAF50' : scalpScore >= 4 ? '#FF9800' : '#F44336';
  const products = BASIC_PRODUCTS[hairGroup] || BASIC_PRODUCTS.Coily;

  return (
    <div className="min-h-screen bg-[#F4F2EE] pb-24">
      {/* Hero */}
      <div className="px-6 pt-14 pb-8" style={{ background: `linear-gradient(160deg, ${accent}30 0%, #1A1A1A 100%)` }}>
        <button onClick={() => navigate('/scan')} className="text-white/60 text-sm font-bold mb-4 flex items-center gap-1">&larr; New Scan</button>
        <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Hair Type</p>
        <div className="flex items-baseline gap-2">
          <h1 className="text-5xl font-black text-white">{hairSubtype}</h1>
          <span className="text-lg font-bold" style={{ color: accent }}>{hairGroup}</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            { l: 'Porosity', v: porosity },
            { l: 'Texture', v: texture },
            { l: 'Scalp', v: scalpCond },
          ].map(p => (
            <div key={p.l} className="bg-white/10 rounded-full px-3 py-1 flex items-center gap-2">
              <span className="text-white/50 text-[10px] font-bold uppercase">{p.l}</span>
              <span className="text-white text-xs font-black capitalize">{p.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scalp score */}
      <div className="mx-4 -mt-3 bg-white rounded-2xl shadow-xs p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-black uppercase tracking-widest text-gray-500">Scalp Health</span>
          <span className="text-2xl font-black text-gray-900">{scalpScore}<span className="text-sm text-gray-400">/10</span></span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="h-full rounded-full" style={{ width: `${(scalpScore/10)*100}%`, backgroundColor: scalpColor }} />
        </div>
      </div>

      {curlPattern && (
        <div className="mx-4 bg-white rounded-2xl shadow-xs p-4 mb-4">
          <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1">{"\uD83C\uDF00"} Curl Pattern</p>
          <p className="text-gray-700 text-sm">{curlPattern}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="mx-4 mb-4">
        <div className="flex bg-white rounded-2xl shadow-xs p-1 gap-0.5">
          {[{ id: 'care', label: '\uD83D\uDC86 Care' }, { id: 'products', label: '\uD83D\uDECD\uFE0F Products' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 px-3 py-2.5 rounded-xl text-[11px] font-black tracking-wide ${tab === t.id ? 'bg-gray-900 text-white' : 'text-gray-400'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'care' && (
        <div className="mx-4 space-y-4">
          {careRecs.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xs p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">{"\u2728"} Care Recommendations</p>
              <div className="space-y-3">
                {careRecs.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0" style={{ backgroundColor: accent }}>{i+1}</div>
                    <p className="text-gray-700 text-sm leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {seekList.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xs p-5">
              <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-2">{"\u2705"} Look For</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {seekList.map((ing, i) => <span key={i} className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full capitalize">{ing}</span>)}
              </div>
              {avoidList.length > 0 && (
                <>
                  <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mb-2">{"\u274C"} Avoid</p>
                  <div className="flex flex-wrap gap-2">
                    {avoidList.map((ing, i) => <span key={i} className="bg-red-50 text-red-600 text-xs font-bold px-3 py-1 rounded-full capitalize">{ing}</span>)}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'products' && (
        <div className="mx-4 space-y-3">
          <p className="text-gray-400 text-xs font-bold">Recommended for {hairSubtype} hair</p>
          {products.map((p, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-xs p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ background: `${accent}20` }}>{"\uD83E\uDDF4"}</div>
              <div>
                <p className="font-black text-gray-900 text-sm">{p.name}</p>
                <p className="text-gray-400 text-[10px] font-bold uppercase">{p.brand} {"\u00B7"} {p.category}</p>
              </div>
            </div>
          ))}
          <p className="text-gray-300 text-[10px] text-center mt-2">Amazon product links coming in next stage</p>
        </div>
      )}

      {/* Talk to Kera */}
      <div className="mx-4 mt-6">
        <button onClick={() => navigate('/chat', { state: { data } })}
          className="w-full py-4 rounded-2xl font-black text-sm tracking-wider uppercase text-white"
          style={{ background: `linear-gradient(135deg, ${accent}, #1A1A1A)` }}>
          {"\uD83D\uDCAC"} Talk to Kera About This
        </button>
      </div>
    </div>
  );
}
