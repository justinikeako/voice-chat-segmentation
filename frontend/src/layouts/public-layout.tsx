import { Link, Outlet } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Container } from "../components/ui/container";

export function PublicLayout() {
	return (
		<div className="min-h-screen flex flex-col bg-brutal-white">
			<header className="brutal-border-b bg-brutal-white sticky top-0 z-50">
				<Container>
					<nav className="flex items-center justify-between h-16 sm:h-20">
						<Link
							to="/"
							className="font-black text-xl sm:text-2xl uppercase tracking-tighter"
						>
							Kera<span className="text-brutal-yellow">.</span>AI
						</Link>

						<div className="hidden md:flex items-center gap-8">
							<a
								href="#features"
								className="text-xs font-black uppercase tracking-wider hover:text-brutal-yellow transition-colors"
							>
								Features
							</a>
							<a
								href="#how-it-works"
								className="text-xs font-black uppercase tracking-wider hover:text-brutal-yellow transition-colors"
							>
								How It Works
							</a>
							<Link
								to="/login"
								className="text-xs font-black uppercase tracking-wider hover:text-brutal-yellow transition-colors"
							>
								Log In
							</Link>
							<Link to="/login">
								<Button size="sm">Get Started</Button>
							</Link>
						</div>

						<Link to="/login" className="md:hidden">
							<Button size="sm">Get Started</Button>
						</Link>
					</nav>
				</Container>
			</header>

			<main className="flex-1">
				<Outlet />
			</main>

			<footer className="bg-brutal-black text-brutal-white brutal-border-t">
				<Container>
					<div className="py-12 sm:py-16">
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
							<div>
								<p className="font-black text-xl uppercase tracking-tighter mb-4">
									Kera<span className="text-brutal-yellow">.</span>AI
								</p>
								<p className="text-sm text-brutal-white/60 leading-relaxed">
									Smart hair care for Afro-Caribbean hair types.
									Your personal hair stylist, in your pocket.
								</p>
							</div>
							<div>
								<p className="font-black text-xs uppercase tracking-wider mb-4 text-brutal-yellow">
									Product
								</p>
								<div className="flex flex-col gap-2 text-sm text-brutal-white/60">
									<a href="#features" className="hover:text-brutal-white transition-colors">
										Features
									</a>
									<a href="#how-it-works" className="hover:text-brutal-white transition-colors">
										How It Works
									</a>
								</div>
							</div>
							<div>
								<p className="font-black text-xs uppercase tracking-wider mb-4 text-brutal-yellow">
									Get Started
								</p>
								<div className="flex flex-col gap-2 text-sm text-brutal-white/60">
									<Link to="/login" className="hover:text-brutal-white transition-colors">
										Sign Up
									</Link>
									<Link to="/login" className="hover:text-brutal-white transition-colors">
										Log In
									</Link>
								</div>
							</div>
						</div>
						<div className="mt-12 pt-8 border-t border-brutal-white/10 text-center text-xs text-brutal-white/40 uppercase tracking-wider">
							&copy; {new Date().getFullYear()} Kera AI. Built for
							your crown.
						</div>
					</div>
				</Container>
			</footer>
		</div>
	);
}
