import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getApiUrl } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Container } from "../components/ui/container";

export default function AuthPage() {
	const navigate = useNavigate();
	const [mode, setMode] = useState<"login" | "signup">("login");
	const [email, setEmail] = useState("");
	const [name, setName] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError("");

		const trimmedEmail = email.trim().toLowerCase();
		if (!trimmedEmail) {
			setError("Email is required");
			return;
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
			setError("Please enter a valid email");
			return;
		}
		if (!password || password.length < 6) {
			setError("Password must be at least 6 characters");
			return;
		}
		if (mode === "signup" && !name.trim()) {
			setError("Name is required");
			return;
		}

		setLoading(true);

		const endpoint =
			mode === "login" ? "/api/auth/login" : "/api/auth/signup";
		const reqBody =
			mode === "login"
				? { email: trimmedEmail, password }
				: { email: trimmedEmail, name: name.trim(), password };

		try {
			const res = await fetch(`${getApiUrl()}${endpoint}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(reqBody),
			});
			const data = await res.json();

			if (!res.ok) {
				setError(data.error || "Something went wrong");
				setLoading(false);
				return;
			}

			localStorage.setItem("kera_token", data.token);
			localStorage.setItem("kera_user_id", data.user.id);
			localStorage.setItem("kera_user_name", data.user.name);
			if (data.user.hair_type) {
				localStorage.setItem("kera_hair_type", data.user.hair_type);
			}

			navigate("/dashboard");
		} catch {
			setError("Could not connect to server. Is the backend running?");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-[70vh] flex items-center justify-center py-12">
			<Container size="sm">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-0">
					{/* Left panel — branding */}
					<Card
						variant="highlight"
						padding="lg"
						className="hidden md:flex flex-col justify-center items-center"
					>
						<div className="w-20 h-20 brutal-border bg-brutal-white flex items-center justify-center mb-6">
							<span className="text-4xl font-black">K</span>
						</div>
						<h2 className="text-3xl font-black uppercase tracking-tighter text-center leading-tight">
							Know Your
							<br />
							Hair.
						</h2>
						<p className="mt-4 text-sm text-brutal-black/60 text-center max-w-xs">
							AI-powered hair care built specifically for
							Afro-Caribbean hair types 3A through 4C.
						</p>
					</Card>

					{/* Right panel — form */}
					<Card variant="default" padding="none" className="md:-ml-[3px]">
						<div className="p-6 sm:p-8">
							{/* Mobile logo */}
							<div className="md:hidden text-center mb-6">
								<div className="w-14 h-14 brutal-border bg-brutal-yellow inline-flex items-center justify-center mb-3">
									<span className="text-2xl font-black">
										K
									</span>
								</div>
								<h1 className="text-xl font-black uppercase tracking-tighter">
									Kera
									<span className="text-brutal-yellow">
										.
									</span>
									AI
								</h1>
							</div>

							{/* Mode toggle */}
							<div className="flex brutal-border mb-6">
								<button
									onClick={() => {
										setMode("login");
										setError("");
									}}
									className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
										mode === "login"
											? "bg-brutal-yellow"
											: "bg-brutal-white hover:bg-brutal-black/5"
									}`}
								>
									Log In
								</button>
								<button
									onClick={() => {
										setMode("signup");
										setError("");
									}}
									className={`flex-1 py-3 text-xs font-black uppercase tracking-wider border-l-3 border-brutal-black transition-colors cursor-pointer ${
										mode === "signup"
											? "bg-brutal-yellow"
											: "bg-brutal-white hover:bg-brutal-black/5"
									}`}
								>
									Sign Up
								</button>
							</div>

							<form
								onSubmit={handleSubmit}
								className="space-y-4"
							>
								{mode === "signup" && (
									<Input
										type="text"
										label="Name"
										placeholder="Your name"
										value={name}
										onChange={(e) =>
											setName(e.target.value)
										}
										required
									/>
								)}
								<Input
									type="email"
									label="Email"
									placeholder="you@example.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
								/>
								<Input
									type="password"
									label="Password"
									placeholder="Min 6 characters"
									value={password}
									onChange={(e) =>
										setPassword(e.target.value)
									}
									required
									minLength={6}
								/>

								{error && (
									<Card
										variant="coral"
										padding="sm"
										className="brutal-shadow-none shadow-none"
									>
										<p className="text-xs font-bold">
											{error}
										</p>
									</Card>
								)}

								<Button
									type="submit"
									disabled={loading}
									className="w-full"
									size="lg"
								>
									{loading
										? "Please wait..."
										: mode === "login"
											? "Log In"
											: "Create Account"}
								</Button>
							</form>

							<div className="mt-6 text-center">
								<button
									onClick={() => {
										localStorage.setItem(
											"kera_user_id",
											"1"
										);
										localStorage.setItem(
											"kera_user_name",
											"Demo User"
										);
										navigate("/dashboard");
									}}
									className="text-xs font-black uppercase tracking-wider text-brutal-black/40 hover:text-brutal-black transition-colors cursor-pointer underline underline-offset-4 decoration-1"
								>
									Skip — try demo mode
								</button>
							</div>
						</div>
					</Card>
				</div>
			</Container>
		</div>
	);
}
