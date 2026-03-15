import { useNavigate } from "react-router-dom";

export function BottomNav({ active }: { active: string }) {
	const navigate = useNavigate();
	const items = [
		{ id: "home", icon: "🏠", label: "Home", route: "/" },
		{ id: "scan", icon: "📡", label: "Scan", route: "/scan" },
		{ id: "shop", icon: "🛍️", label: "Shop", route: "/shop" },
		{ id: "learn", icon: "📚", label: "Learn", route: "/learn" },
		{ id: "weekly", icon: "📊", label: "History", route: "/weekly" },
	];
	return (
		<div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 z-50 shadow-lg">
			<div className="flex justify-around max-w-md mx-auto">
				{items.map((item) => (
					<button
						key={item.id}
						onClick={() => navigate(item.route)}
						className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${active === item.id ? "text-amber-500" : "text-gray-400"}`}
					>
						<span className="text-lg">{item.icon}</span>
						<span className="text-[9px] font-black tracking-wider uppercase">
							{item.label}
						</span>
					</button>
				))}
			</div>
		</div>
	);
}
