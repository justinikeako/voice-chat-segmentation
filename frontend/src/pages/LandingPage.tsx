import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Container } from "../components/ui/container";
import { Section } from "../components/ui/section";
import { Badge } from "../components/ui/badge";

const FEATURES = [
	{
		title: "Hair Scan",
		description:
			"Point your camera and instantly know your exact hair type — 4C, 3B, 2A, you name it. Powered by AI that actually understands Afro-Caribbean hair.",
		color: "bg-brutal-yellow" as const,
		tag: "Core Feature",
		icon: "◎",
	},
	{
		title: "Product Recs",
		description:
			"Get product recommendations from Amazon and local Jamaican stores, matched specifically to your hair type and needs.",
		color: "bg-brutal-lavender" as const,
		tag: "Smart Shopping",
		icon: "✦",
	},
	{
		title: "In-Store Scanner",
		description:
			"Walking through a store? Scan any product bottle and Kera tells you if it's right for YOUR hair. No more guessing.",
		color: "bg-brutal-coral" as const,
		tag: "Game Changer",
		icon: "⊞",
	},
	{
		title: "Hair Science",
		description:
			"Learn about porosity, shrinkage, wash day routines, and the science behind your unique hair. Knowledge is power.",
		color: "bg-brutal-sky" as const,
		tag: "Education",
		icon: "△",
	},
	{
		title: "Weekly Tracking",
		description:
			"Track your hair health over time with weekly check-ins. See trends, get alerts, and watch your hair journey unfold.",
		color: "bg-brutal-lime" as const,
		tag: "Progress",
		icon: "▤",
	},
];

const STEPS = [
	{
		number: "01",
		title: "Scan Your Hair",
		description:
			"Open the camera, let Kera analyse your hair type, porosity, and scalp health in seconds.",
	},
	{
		number: "02",
		title: "Get Your Profile",
		description:
			"Receive a detailed breakdown of your hair with personalised care recommendations.",
	},
	{
		number: "03",
		title: "Shop Smart",
		description:
			"Find products that actually work for your hair — online or in-store with our scanner.",
	},
];

export default function LandingPage() {
	return (
		<>
			{/* Hero */}
			<Section bg="white" className="pt-20 sm:pt-28 pb-12 sm:pb-20">
				<Container>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
						<div>
							<Badge variant="warning" className="mb-6">
								Built for Afro-Caribbean Hair
							</Badge>
							<h1 className="text-5xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.9]">
								Know Your
								<br />
								Hair.
								<br />
								<span className="text-brutal-yellow">
									Love Your
								</span>
								<br />
								Hair.
							</h1>
							<p className="mt-6 text-lg sm:text-xl text-brutal-black/60 max-w-md leading-relaxed">
								Your AI-powered hair stylist that scans,
								recommends, and educates — built specifically
								for types 3A through 4C.
							</p>
							<div className="mt-8 flex flex-wrap gap-3">
								<Link to="/login">
									<Button size="lg">Get Started Free</Button>
								</Link>
								<a href="#features">
									<Button size="lg" variant="secondary">
										See Features
									</Button>
								</a>
							</div>
						</div>
						<div className="relative">
							<Card
								variant="highlight"
								padding="lg"
								className="rotate-2 hover:rotate-0 transition-transform"
							>
								<div className="space-y-4">
									<div className="flex gap-2">
										<Badge variant="success">4C</Badge>
										<Badge variant="info">
											High Porosity
										</Badge>
										<Badge variant="lavender">
											Coily
										</Badge>
									</div>
									<div className="brutal-border bg-brutal-white p-4">
										<p className="text-xs font-black uppercase tracking-wider text-brutal-black/50 mb-1">
											Scalp Score
										</p>
										<div className="flex items-end gap-2">
											<span className="text-4xl font-black">
												87
											</span>
											<span className="text-sm font-bold text-brutal-black/50 mb-1">
												/ 100
											</span>
										</div>
										<div className="mt-2 h-3 brutal-border-thin bg-brutal-gray">
											<div
												className="h-full bg-brutal-lime"
												style={{ width: "87%" }}
											/>
										</div>
									</div>
									<div className="brutal-border bg-brutal-white p-4">
										<p className="text-xs font-black uppercase tracking-wider text-brutal-black/50 mb-2">
											Recommended
										</p>
										<div className="flex gap-2">
											<div className="flex-1 bg-brutal-lavender brutal-border-thin p-2 text-center">
												<p className="text-[10px] font-black uppercase">
													Deep Conditioner
												</p>
											</div>
											<div className="flex-1 bg-brutal-sky brutal-border-thin p-2 text-center">
												<p className="text-[10px] font-black uppercase">
													Leave-In Cream
												</p>
											</div>
										</div>
									</div>
								</div>
							</Card>
						</div>
					</div>
				</Container>
			</Section>

			{/* Features */}
			<Section
				id="features"
				bg="black"
				title="What Kera Does"
				subtitle="Five features, one mission — healthy hair."
				className="brutal-border-t"
			>
				<Container>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{FEATURES.map((f, i) => (
							<Card
								key={i}
								padding="none"
								className={`${f.color} flex flex-col`}
							>
								<div className="p-5 flex-1">
									<span className="text-3xl leading-none">
										{f.icon}
									</span>
									<Badge
										variant="default"
										className="mt-3 mb-2"
									>
										{f.tag}
									</Badge>
									<h3 className="text-xl font-black uppercase tracking-tight mb-2">
										{f.title}
									</h3>
									<p className="text-sm leading-relaxed text-brutal-black/70">
										{f.description}
									</p>
								</div>
							</Card>
						))}
					</div>
				</Container>
			</Section>

			{/* How it Works */}
			<Section
				id="how-it-works"
				bg="yellow"
				title="How It Works"
				subtitle="Three steps to better hair days."
				className="brutal-border-t"
			>
				<Container>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{STEPS.map((step) => (
							<Card key={step.number} variant="default" padding="lg">
								<span className="text-5xl font-black text-brutal-black/10 leading-none">
									{step.number}
								</span>
								<h3 className="mt-4 text-xl font-black uppercase tracking-tight">
									{step.title}
								</h3>
								<p className="mt-2 text-sm text-brutal-black/60 leading-relaxed">
									{step.description}
								</p>
							</Card>
						))}
					</div>
				</Container>
			</Section>

			{/* Stats */}
			<Section bg="white" className="brutal-border-t">
				<Container>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						{[
							{ stat: "14+", label: "Hair types supported" },
							{ stat: "500+", label: "Products analysed" },
							{ stat: "75%", label: "Shrinkage is normal" },
							{ stat: "9x", label: "Volume vs straight hair" },
						].map((s, i) => (
							<Card key={i} variant="flat" className="text-center">
								<p className="text-4xl sm:text-5xl font-black">
									{s.stat}
								</p>
								<p className="mt-1 text-xs font-black uppercase tracking-wider text-brutal-black/50">
									{s.label}
								</p>
							</Card>
						))}
					</div>
				</Container>
			</Section>

			{/* CTA */}
			<Section bg="coral" className="brutal-border-t text-center">
				<Container size="md">
					<h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter leading-[0.9]">
						Start Your
						<br />
						Hair Journey
					</h2>
					<p className="mt-4 text-lg text-brutal-black/70 max-w-md mx-auto">
						Join Kera AI and finally understand your hair. It&apos;s
						free, personal, and built for you.
					</p>
					<Link to="/login" className="inline-block mt-8">
						<Button size="lg" variant="secondary">
							Get Started Free
						</Button>
					</Link>
				</Container>
			</Section>
		</>
	);
}
