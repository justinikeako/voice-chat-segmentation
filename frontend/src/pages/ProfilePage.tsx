import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const getApiUrl = () => {
	const saved = localStorage.getItem("VITE_API_URL");
	if (saved) return saved;
	const env = process.env.REACT_APP_API_URL;
	if (env) return env;
	if (
		window.location.hostname !== "localhost" &&
		window.location.hostname !== "127.0.0.1"
	)
		return window.location.origin;
	return "http://127.0.0.1:5000";
};

export default function ProfilePage() {
	const navigate = useNavigate();
	const user = useQuery({
		queryKey: ["user"],
		queryFn: async () => {
			const token = localStorage.getItem("kera_token");

			const res = await fetch(`${getApiUrl()}/api/auth/me`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || "Failed to fetch user");
			}

			return data?.user as {
				name: string;
				email: string;
				hair_type: string;
				porosity: string;
				scalp_condition: string;
				texture: string;
			};
		},
	});

	const userName = localStorage.getItem("kera_user_name") || "Demo User";
	const hairType = localStorage.getItem("kera_hair_type");

	const handleLogout = () => {
		localStorage.removeItem("kera_token");
		localStorage.removeItem("kera_user_id");
		localStorage.removeItem("kera_user_name");
		localStorage.removeItem("kera_hair_type");
		navigate("/auth");
	};

	const profile = user.data || {
		name: userName,
		hair_type: hairType,
		email: "example@example.com",
		porosity: "",
		scalp_condition: "",
		texture: "",
	};

	return (
		<div className="min-h-screen bg-[#F4F2EE]">
			{/* Header */}
			<div className="bg-[#1A1A1A] px-6 pt-14 pb-8">
				<button
					onClick={() => navigate("/")}
					className="text-gray-400 text-sm flex items-center gap-1 mb-4 font-semibold"
				>
					<svg
						className="w-4 h-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M15 19l-7-7 7-7"
						/>
					</svg>
					Back
				</button>

				<div className="flex items-center gap-4">
					<div className="w-14 h-14 rounded-full bg-amber-400/20 border-2 border-amber-400/40 flex items-center justify-center">
						<span className="text-2xl font-black text-amber-400">
							{(profile.name || "U")[0].toUpperCase()}
						</span>
					</div>
					<div>
						<h1 className="text-xl font-black text-white">{profile.name}</h1>
						{profile.email && (
							<p className="text-gray-400 text-xs">{profile.email}</p>
						)}
					</div>
				</div>
			</div>

			{/* Profile info */}
			<div className="px-4 pt-5 space-y-3">
				{profile.hair_type && (
					<div className="bg-white rounded-2xl p-4 shadow-sm">
						<p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
							Hair Profile
						</p>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<p className="text-xs text-gray-400">Hair Type</p>
								<p className="text-sm font-black text-gray-900">
									{profile.hair_type}
								</p>
							</div>
							{profile.porosity && (
								<div>
									<p className="text-xs text-gray-400">Porosity</p>
									<p className="text-sm font-black text-gray-900">
										{profile.porosity}
									</p>
								</div>
							)}
							{profile.scalp_condition && (
								<div>
									<p className="text-xs text-gray-400">Scalp</p>
									<p className="text-sm font-black text-gray-900">
										{profile.scalp_condition}
									</p>
								</div>
							)}
							{profile.texture && (
								<div>
									<p className="text-xs text-gray-400">Texture</p>
									<p className="text-sm font-black text-gray-900">
										{profile.texture}
									</p>
								</div>
							)}
						</div>
					</div>
				)}

				{!profile.hair_type && (
					<div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
						<p className="text-amber-800 text-xs font-semibold">
							No hair profile yet. Do a scan to get your personalized hair
							analysis.
						</p>
						<button
							onClick={() => navigate("/scan")}
							className="mt-3 px-4 py-2 bg-amber-400 text-[#1A1A1A] rounded-xl text-xs font-black"
						>
							Start Scan
						</button>
					</div>
				)}

				{/* Account section */}
				<div className="bg-white rounded-2xl shadow-sm overflow-hidden">
					<p className="px-4 pt-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
						Account
					</p>

					<button
						onClick={() => navigate("/weekly")}
						className="w-full px-4 py-3.5 flex items-center justify-between border-b border-gray-50 active:bg-gray-50"
					>
						<span className="text-sm text-gray-700 font-semibold">
							Scan History
						</span>
						<svg
							className="w-4 h-4 text-gray-300"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 5l7 7-7 7"
							/>
						</svg>
					</button>

					<button
						onClick={handleLogout}
						className="w-full px-4 py-3.5 flex items-center justify-between active:bg-red-50"
					>
						<span className="text-sm text-red-500 font-semibold">Log Out</span>
						<svg
							className="w-4 h-4 text-red-300"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
							/>
						</svg>
					</button>
				</div>
			</div>
		</div>
	);
}
