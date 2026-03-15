import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";
import { Container } from "../components/ui/container";

const NAV_ITEMS = [
	{ to: "/dashboard", label: "Home", icon: "⌂" },
	{ to: "/scan", label: "Scan", icon: "◎" },
	{ to: "/shop", label: "Shop", icon: "✦" },
	{ to: "/learn", label: "Learn", icon: "△" },
	{ to: "/weekly", label: "History", icon: "▤" },
];

function RequireAuth({ children }: { children: React.ReactNode }) {
	const token = localStorage.getItem("kera_token");
	const userId = localStorage.getItem("kera_user_id");
	if (!token && !userId) {
		return <Navigate to="/login" replace />;
	}
	return children;
}

function TopNav() {
	const userName = localStorage.getItem("kera_user_name");

	return (
		<header className="brutal-border-b bg-brutal-white sticky top-0 z-50">
			<Container>
				<nav className="flex items-center justify-between h-14 sm:h-16">
					<NavLink
						to="/dashboard"
						className="font-black text-lg sm:text-xl uppercase tracking-tighter"
					>
						Kera<span className="text-brutal-yellow">.</span>AI
					</NavLink>

					<div className="hidden md:flex items-center gap-1">
						{NAV_ITEMS.map((item) => (
							<NavLink
								key={item.to}
								to={item.to}
								className={({ isActive }) =>
									cn(
										"px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors",
										isActive
											? "bg-brutal-yellow"
											: "hover:bg-brutal-black/5"
									)
								}
							>
								{item.label}
							</NavLink>
						))}
					</div>

					<NavLink
						to="/profile"
						className={({ isActive }) =>
							cn(
								"w-9 h-9 brutal-border-thin flex items-center justify-center font-black text-sm",
								isActive
									? "bg-brutal-yellow"
									: "bg-brutal-white hover:bg-brutal-yellow/30"
							)
						}
					>
						{userName?.charAt(0)?.toUpperCase() ?? "?"}
					</NavLink>
				</nav>
			</Container>
		</header>
	);
}

function BottomNav() {
	const location = useLocation();

	return (
		<nav className="md:hidden fixed bottom-0 left-0 right-0 bg-brutal-white brutal-border-t z-50 pb-[env(safe-area-inset-bottom)]">
			<div className="flex justify-around">
				{NAV_ITEMS.map((item) => {
					const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
					return (
						<NavLink
							key={item.to}
							to={item.to}
							className={cn(
								"flex flex-col items-center gap-0.5 px-3 py-2.5 flex-1 transition-colors",
								isActive
									? "bg-brutal-yellow text-brutal-black"
									: "text-brutal-black/40"
							)}
						>
							<span className="text-base leading-none">{item.icon}</span>
							<span className="text-[9px] font-black uppercase tracking-wider">
								{item.label}
							</span>
						</NavLink>
					);
				})}
			</div>
		</nav>
	);
}

export function AppLayout() {
	return (
		<RequireAuth>
			<div className="min-h-screen flex flex-col bg-brutal-white">
				<TopNav />
				<main className="flex-1 pb-20 md:pb-0">
					<Outlet />
				</main>
				<BottomNav />
			</div>
		</RequireAuth>
	);
}
