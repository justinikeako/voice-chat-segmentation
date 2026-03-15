// frontend/src/pages/LearnPage.jsx
// Hair education: understand your hair type, care routines, shrinkage, porosity
// Inspired by the HairMatch YouTube demo transcript and the Andre Walker system
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav, DemoTip } from './HomePage';

interface LessonSection {
  heading: string;
  content: string;
  tags?: string[];
}

interface Lesson {
  id: string;
  emoji: string;
  title: string;
  color: string;
  bg: string;
  sections: LessonSection[];
}

const LESSONS: Lesson[] = [
  {
    id: 'types',
    emoji: '🌀',
    title: 'The Andre Walker System',
    color: '#f59e0b',
    bg: '#fffbeb',
    sections: [
      {
        heading: 'Type 4 — Coily',
        content: 'Type 4 hair has the tightest curl patterns and the most shrinkage (up to 75%). It\'s divided into 4A (springy S-coils), 4B (Z-pattern coils) and 4C (extremely tight zigzag, minimal definition). Coily hair is the most fragile type and needs the most moisture.',
        tags: ['4A', '4B', '4C'],
      },
      {
        heading: 'Type 3 — Curly',
        content: 'Type 3 hair ranges from loose spirals (3A) to springy ringlets (3B) to tight corkscrews (3C). It has a visible S-pattern when stretched. Moisture and anti-frizz products are key.',
        tags: ['3A', '3B', '3C'],
      },
      {
        heading: 'Type 2 — Wavy',
        content: 'Type 2 hair lies between straight and curly. 2A is loose waves, 2B has more defined waves, 2C has thick waves prone to frizz. Lightweight products work best.',
        tags: ['2A', '2B', '2C'],
      },
      {
        heading: 'Type 1 — Straight',
        content: 'Naturally straight hair with no curl pattern. Produces the most sebum which travels down the shaft easily, making it the oiliest type but also the most naturally moisturised.',
        tags: ['1A', '1B', '1C'],
      },
    ],
  },
  {
    id: 'porosity',
    emoji: '💧',
    title: 'Porosity: Your Hair\'s Secret',
    color: '#06b6d4',
    bg: '#ecfeff',
    sections: [
      {
        heading: 'What is porosity?',
        content: 'Porosity is how well your hair absorbs and retains moisture. It\'s determined by the condition of your hair\'s cuticle layer. Understanding yours is the single most important factor for choosing the right products.',
      },
      {
        heading: 'Low Porosity',
        content: 'The cuticle is tightly closed. Water beads on the surface. Products sit on top instead of absorbing. Fix: use heat to open the cuticle (warm deep conditioner). Look for humectants like honey and glycerin.',
      },
      {
        heading: 'Medium Porosity',
        content: 'The ideal state. Cuticle absorbs and retains moisture well. Requires the least maintenance. Keep using what works.',
      },
      {
        heading: 'High Porosity',
        content: 'Cuticle has gaps (from damage, bleaching, or genetics). Absorbs moisture fast but loses it equally fast. Fix: protein treatments to fill gaps + sealants like butters and oils to lock moisture in.',
      },
    ],
  },
  {
    id: 'shrinkage',
    emoji: '📏',
    title: 'Shrinkage: The Superpower',
    color: '#8b5cf6',
    bg: '#f5f3ff',
    sections: [
      {
        heading: 'What is shrinkage?',
        content: 'Shrinkage is how much your hair contracts from its stretched length when dry. 4C hair can shrink up to 75% — meaning 12 inches of hair looks like 3 inches. It\'s completely normal and a sign of healthy elasticity.',
      },
      {
        heading: 'Why it matters',
        content: 'High shrinkage is actually proof your hair is healthy and elastic. When hair loses elasticity (from damage), it doesn\'t spring back — so it won\'t shrink as much either. Embrace it.',
      },
      {
        heading: 'Managing shrinkage',
        content: 'Stretch methods: banding, threading, twist-outs and braid-outs. These elongate without heat damage. Avoid blow-drying with high heat — it causes real damage to reduce shrinkage.',
      },
    ],
  },
  {
    id: 'washday',
    emoji: '🚿',
    title: 'Wash Day Routine',
    color: '#10b981',
    bg: '#ecfdf5',
    sections: [
      {
        heading: 'Pre-poo',
        content: 'Before shampooing, apply an oil (coconut, olive or castor) to dry hair. This pre-treatment stops the shampoo from stripping too much moisture from coily hair.',
      },
      {
        heading: 'Shampoo',
        content: 'For coily/curly hair, use a sulfate-free shampoo. Sulfates are the foaming agent in most shampoos — great for straight hair but strip too much oil from coily strands.',
      },
      {
        heading: 'Deep conditioner',
        content: 'Apply a deep conditioner after shampooing and leave for 20–30 min with a plastic cap. The heat from your own head activates it. This is non-negotiable for 4C hair.',
      },
      {
        heading: 'LOC/LCO Method',
        content: 'Lock in moisture with the LOC method: Liquid (water or leave-in) → Oil (seals the liquid) → Cream (butter or styler). Or LCO for finer hair (Liquid → Cream → Oil). This keeps coily hair moisturised between wash days.',
      },
    ],
  },
  {
    id: 'scalp',
    emoji: '🧠',
    title: 'Scalp Health',
    color: '#ec4899',
    bg: '#fdf2f8',
    sections: [
      {
        heading: 'Why scalp health comes first',
        content: 'Your scalp is skin. Healthy hair grows from a healthy scalp. No serum or cream applied to the hair shaft fixes problems that start at the root — dryness, buildup, or dandruff need to be addressed at the scalp level.',
      },
      {
        heading: 'Common scalp issues',
        content: 'Dryness (flaking, tight feeling): massage with Jamaican Black Castor Oil. Buildup (heavy, waxy feeling): clarifying shampoo once a month. Oily (within 1-2 days of wash): over-moisturising the scalp — products should go on hair, not scalp.',
      },
      {
        heading: 'Kera\'s scalp score',
        content: 'Kera AI gives your scalp a score from 1–10 at every scan. Track this over time in the Weekly Tracker. A score below 5 means your scalp needs immediate attention before focusing on styling.',
      },
    ],
  },
];

export default function LearnPage() {
  const navigate       = useNavigate();
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#F4F2EE] pb-28">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="bg-[#1A1A1A] px-6 pt-14 pb-6">
        <button onClick={() => navigate('/')} className="text-gray-400 text-sm flex items-center gap-1 mb-3 font-semibold">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <p className="text-pink-400 text-[10px] font-black tracking-[0.3em] uppercase">Education</p>
        <h1 className="text-2xl font-black text-white">Learn Your Hair</h1>
        <p className="text-gray-400 text-xs mt-1">Everything you wish you knew sooner.</p>
      </div>

      {/* ── LESSON CARDS ───────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 space-y-3">
        {LESSONS.map(lesson => (
          <div key={lesson.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setActive(active === lesson.id ? null : lesson.id)}
              className="w-full px-5 py-4 flex items-center gap-4 active:bg-gray-50 transition-colors"
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                style={{ backgroundColor: lesson.bg }}>
                {lesson.emoji}
              </div>
              <div className="flex-1 text-left">
                <p className="font-black text-gray-900 text-sm">{lesson.title}</p>
                <p className="text-xs text-gray-400">{lesson.sections.length} sections</p>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${active === lesson.id ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {active === lesson.id && (
              <div className="border-t border-gray-50 px-5 pb-5 pt-4 space-y-4">
                {lesson.sections.map((sec, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black text-white"
                        style={{ backgroundColor: lesson.color }}>
                        {i + 1}
                      </div>
                      <p className="font-black text-gray-900 text-sm">{sec.heading}</p>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed pl-7">{sec.content}</p>
                    {sec.tags && (
                      <div className="flex gap-1 mt-2 pl-7 flex-wrap">
                        {sec.tags.map((tag: string) => (
                          <span key={tag}
                            className="text-[11px] font-black px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: lesson.bg, color: lesson.color }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Quick stat card like HairMatch demo */}
        <div className="bg-[#1A1A1A] rounded-2xl p-5">
          <p className="text-amber-400 text-[10px] font-black tracking-[0.3em] uppercase mb-3">Did You Know?</p>
          <div className="space-y-3">
            {[
              { stat: '9×', desc: 'Black women spend 9× more on hair products than other demographics.' },
              { stat: '43%', desc: 'of Black women use 5 or more hair products — most without knowing their actual hair type.' },
              { stat: '75%', desc: 'Shrinkage for 4C hair — this is healthy, not damaged.' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <span className="text-2xl font-black text-amber-400 leading-none">{item.stat}</span>
                <p className="text-gray-400 text-xs leading-relaxed flex-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA to scan */}
        <button
          onClick={() => navigate('/scan')}
          className="w-full py-4 bg-amber-400 text-black rounded-2xl text-sm font-black tracking-wider uppercase active:scale-[0.98] transition-transform"
        >
          📡 Scan My Hair Now
        </button>
      </div>

      <DemoTip />

      <BottomNav active="learn" />
    </div>
  );
}