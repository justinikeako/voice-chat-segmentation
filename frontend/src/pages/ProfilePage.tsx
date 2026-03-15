import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getApiUrl } from "../lib/utils";
import { Container } from "../components/ui/container";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Avatar } from "../components/ui/avatar";

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
			if (!res.ok) throw new Error(data.error || "Failed to fetch user");
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
		navigate("/login");
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
		<Container className="py-6 sm:py-10">
			{/* Profile header */}
			<div className="flex items-center gap-4 mb-8">
				<Avatar name={profile.name} size="xl" />
				<div>
					<h1 className="text-2xl font-black uppercase tracking-tight">{profile.name}</h1>
					{profile.email && (
						<p className="text-brutal-black/40 text-sm">{profile.email}</p>
					)}
				</div>
			</div>

			{/* Hair profile */}
			{profile.hair_type ? (
				<Card variant="default" padding="md" className="mb-4">
					<p className="text-[10px] font-black uppercase tracking-widest text-brutal-black/40 mb-4">Hair Profile</p>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<p className="text-xs text-brutal-black/40 font-bold uppercase">Hair Type</p>
							<p className="text-lg font-black">{profile.hair_type}</p>
						</div>
						{profile.porosity && (
							<div>
								<p className="text-xs text-brutal-black/40 font-bold uppercase">Porosity</p>
								<p className="text-lg font-black">{profile.porosity}</p>
							</div>
						)}
						{profile.scalp_condition && (
							<div>
								<p className="text-xs text-brutal-black/40 font-bold uppercase">Scalp</p>
								<p className="text-lg font-black">{profile.scalp_condition}</p>
							</div>
						)}
						{profile.texture && (
							<div>
								<p className="text-xs text-brutal-black/40 font-bold uppercase">Texture</p>
								<p className="text-lg font-black">{profile.texture}</p>
							</div>
						)}
					</div>
				</Card>
			) : (
				<Card variant="highlight" padding="md" className="mb-4">
					<p className="text-sm font-bold">
						No hair profile yet. Do a scan to get your personalized hair analysis.
					</p>
					<Button size="sm" className="mt-3" onClick={() => navigate("/scan")}>
						Start Scan
					</Button>
				</Card>
			)}

			{/* Account section */}
			<Card variant="default" padding="none">
				<div className="px-4 pt-4 pb-2">
					<p className="text-[10px] font-black uppercase tracking-widest text-brutal-black/40">Account</p>
				</div>

				<button
					onClick={() => navigate("/weekly")}
					className="w-full px-4 py-4 flex items-center justify-between brutal-border-t hover:bg-brutal-yellow/10 transition-colors cursor-pointer"
				>
					<span className="text-sm font-black uppercase tracking-tight">Scan History</span>
					<span className="text-brutal-black/30">&rarr;</span>
				</button>

				<button
					onClick={handleLogout}
					className="w-full px-4 py-4 flex items-center justify-between brutal-border-t hover:bg-brutal-coral/10 transition-colors cursor-pointer"
				>
					<span className="text-sm font-black uppercase tracking-tight text-brutal-coral">Log Out</span>
					<span className="text-brutal-coral/30">&rarr;</span>
				</button>
			</Card>
		</Container>
	);
}
