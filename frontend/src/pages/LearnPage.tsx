import { useNavigate } from "react-router-dom";
import { Container } from "../components/ui/container";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Accordion } from "../components/ui/accordion";
import { DemoTip } from "../components/ui/demo-tip";

interface LessonSection {
	heading: string;
	content: string;
	tags?: string[];
}

interface Lesson {
	id: string;
	icon: string;
	title: string;
	variant: "highlight" | "lavender" | "coral" | "lime" | "default";
	sections: LessonSection[];
}

const LESSONS: Lesson[] = [
	{
		id: "types",
		icon: "◎",
		title: "The Andre Walker System",
		variant: "highlight",
		sections: [
			{ heading: "Type 4 — Coily", content: "Type 4 hair has the tightest curl patterns and the most shrinkage (up to 75%). It's divided into 4A (springy S-coils), 4B (Z-pattern coils) and 4C (extremely tight zigzag, minimal definition). Coily hair is the most fragile type and needs the most moisture.", tags: ["4A", "4B", "4C"] },
			{ heading: "Type 3 — Curly", content: "Type 3 hair ranges from loose spirals (3A) to springy ringlets (3B) to tight corkscrews (3C). It has a visible S-pattern when stretched. Moisture and anti-frizz products are key.", tags: ["3A", "3B", "3C"] },
			{ heading: "Type 2 — Wavy", content: "Type 2 hair lies between straight and curly. 2A is loose waves, 2B has more defined waves, 2C has thick waves prone to frizz. Lightweight products work best.", tags: ["2A", "2B", "2C"] },
			{ heading: "Type 1 — Straight", content: "Naturally straight hair with no curl pattern. Produces the most sebum which travels down the shaft easily, making it the oiliest type but also the most naturally moisturised.", tags: ["1A", "1B", "1C"] },
		],
	},
	{
		id: "porosity",
		icon: "◆",
		title: "Porosity: Your Hair's Secret",
		variant: "lavender",
		sections: [
			{ heading: "What is porosity?", content: "Porosity is how well your hair absorbs and retains moisture. It's determined by the condition of your hair's cuticle layer. Understanding yours is the single most important factor for choosing the right products." },
			{ heading: "Low Porosity", content: "The cuticle is tightly closed. Water beads on the surface. Products sit on top instead of absorbing. Fix: use heat to open the cuticle (warm deep conditioner). Look for humectants like honey and glycerin." },
			{ heading: "Medium Porosity", content: "The ideal state. Cuticle absorbs and retains moisture well. Requires the least maintenance. Keep using what works." },
			{ heading: "High Porosity", content: "Cuticle has gaps (from damage, bleaching, or genetics). Absorbs moisture fast but loses it equally fast. Fix: protein treatments to fill gaps + sealants like butters and oils to lock moisture in." },
		],
	},
	{
		id: "shrinkage",
		icon: "△",
		title: "Shrinkage: The Superpower",
		variant: "coral",
		sections: [
			{ heading: "What is shrinkage?", content: "Shrinkage is how much your hair contracts from its stretched length when dry. 4C hair can shrink up to 75% — meaning 12 inches of hair looks like 3 inches. It's completely normal and a sign of healthy elasticity." },
			{ heading: "Why it matters", content: "High shrinkage is actually proof your hair is healthy and elastic. When hair loses elasticity (from damage), it doesn't spring back — so it won't shrink as much either. Embrace it." },
			{ heading: "Managing shrinkage", content: "Stretch methods: banding, threading, twist-outs and braid-outs. These elongate without heat damage. Avoid blow-drying with high heat — it causes real damage to reduce shrinkage." },
		],
	},
	{
		id: "washday",
		icon: "✦",
		title: "Wash Day Routine",
		variant: "lime",
		sections: [
			{ heading: "Pre-poo", content: "Before shampooing, apply an oil (coconut, olive or castor) to dry hair. This pre-treatment stops the shampoo from stripping too much moisture from coily hair." },
			{ heading: "Shampoo", content: "For coily/curly hair, use a sulfate-free shampoo. Sulfates are the foaming agent in most shampoos — great for straight hair but strip too much oil from coily strands." },
			{ heading: "Deep conditioner", content: "Apply a deep conditioner after shampooing and leave for 20-30 min with a plastic cap. The heat from your own head activates it. This is non-negotiable for 4C hair." },
			{ heading: "LOC/LCO Method", content: "Lock in moisture with the LOC method: Liquid (water or leave-in) -> Oil (seals the liquid) -> Cream (butter or styler). Or LCO for finer hair. This keeps coily hair moisturised between wash days." },
		],
	},
	{
		id: "scalp",
		icon: "⊞",
		title: "Scalp Health",
		variant: "default",
		sections: [
			{ heading: "Why scalp health comes first", content: "Your scalp is skin. Healthy hair grows from a healthy scalp. No serum or cream applied to the hair shaft fixes problems that start at the root." },
			{ heading: "Common scalp issues", content: "Dryness (flaking, tight feeling): massage with Jamaican Black Castor Oil. Buildup (heavy, waxy feeling): clarifying shampoo once a month. Oily: over-moisturising the scalp — products should go on hair, not scalp." },
			{ heading: "Kera's scalp score", content: "Kera AI gives your scalp a score from 1-10 at every scan. Track this over time in the Weekly Tracker. A score below 5 means your scalp needs immediate attention before focusing on styling." },
		],
	},
];

export default function LearnPage() {
	const navigate = useNavigate();

	return (
		<Container className="py-6 sm:py-10">
			{/* Header */}
			<div className="mb-8">
				<p className="text-xs font-black uppercase tracking-wider text-brutal-black/40 mb-1">Education</p>
				<h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter">Learn Your Hair</h1>
				<p className="text-brutal-black/50 text-sm mt-1">Everything you wish you knew sooner.</p>
			</div>

			{/* Lessons */}
			<div className="space-y-4">
				{LESSONS.map((lesson) => (
					<Card key={lesson.id} variant={lesson.variant} padding="none">
						<div className="p-4 pb-0">
							<div className="flex items-center gap-3 mb-3">
								<span className="text-2xl">{lesson.icon}</span>
								<h3 className="font-black text-sm uppercase tracking-tight">{lesson.title}</h3>
								<Badge variant="default" className="ml-auto text-[9px]">{lesson.sections.length} sections</Badge>
							</div>
						</div>
						<Accordion
							items={lesson.sections.map((sec, i) => ({
								id: `${lesson.id}-${i}`,
								title: sec.heading,
								content: (
									<div>
										<p className="text-sm leading-relaxed text-brutal-black/70">{sec.content}</p>
										{sec.tags && (
											<div className="flex gap-1.5 mt-3 flex-wrap">
												{sec.tags.map((tag) => <Badge key={tag} variant="warning">{tag}</Badge>)}
											</div>
										)}
									</div>
								),
							}))}
							allowMultiple
						/>
					</Card>
				))}

				{/* Did You Know */}
				<Card variant="flat" padding="md" className="bg-brutal-black text-brutal-white">
					<p className="text-brutal-yellow text-[10px] font-black tracking-widest uppercase mb-4">Did You Know?</p>
					<div className="space-y-4">
						{[
							{ stat: "9x", desc: "Black women spend 9x more on hair products than other demographics." },
							{ stat: "43%", desc: "of Black women use 5 or more hair products — most without knowing their actual hair type." },
							{ stat: "75%", desc: "Shrinkage for 4C hair — this is healthy, not damaged." },
						].map((item, i) => (
							<div key={i} className="flex items-start gap-4">
								<span className="text-3xl font-black text-brutal-yellow leading-none shrink-0 w-12">{item.stat}</span>
								<p className="text-brutal-white/60 text-xs leading-relaxed flex-1">{item.desc}</p>
							</div>
						))}
					</div>
				</Card>

				<Button className="w-full" size="lg" onClick={() => navigate("/scan")}>
					Scan My Hair Now
				</Button>
			</div>

			<div className="mt-6">
				<DemoTip />
			</div>
		</Container>
	);
}
