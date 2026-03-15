// frontend/src/App.jsx
// All routes wired: Auth, Home, Scan, Results, Chat, Weekly, Shop, InStore, Learn
import React from "react";
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
} from "react-router-dom";

import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import ScanPage from "./pages/ScanPage";
import ResultsPage from "./pages/ResultsPage";
import KeraChatPage from "./pages/KeraChatPage";
import WeeklyCheckPage from "./pages/WeeklyCheckPage";
import ShopPage from "./pages/ShopPage";
import InStorePage from "./pages/InStorePage";
import LearnPage from "./pages/LearnPage";
import ProfilePage from "./pages/ProfilePage";

function RequireAuth({ children }: { children: React.ReactNode }) {
	const token = localStorage.getItem("kera_token");
	const userId = localStorage.getItem("kera_user_id");
	// Allow access if they have a token OR a user_id (demo mode)
	if (!token && !userId) {
		return <Navigate to="/auth" replace />;
	}
	return children;
}

export default function App() {
	return (
		<Router>
			<Routes>
				{/* Auth */}
				<Route path="/auth" element={<AuthPage />} />

				{/* Protected Routes */}
				<Route
					path="/"
					element={
						<RequireAuth>
							<HomePage />
						</RequireAuth>
					}
				/>
				<Route
					path="/scan"
					element={
						<RequireAuth>
							<ScanPage />
						</RequireAuth>
					}
				/>
				<Route
					path="/results"
					element={
						<RequireAuth>
							<ResultsPage />
						</RequireAuth>
					}
				/>
				<Route
					path="/chat"
					element={
						<RequireAuth>
							<KeraChatPage />
						</RequireAuth>
					}
				/>
				<Route
					path="/weekly"
					element={
						<RequireAuth>
							<WeeklyCheckPage />
						</RequireAuth>
					}
				/>
				<Route
					path="/shop"
					element={
						<RequireAuth>
							<ShopPage />
						</RequireAuth>
					}
				/>
				<Route
					path="/instore"
					element={
						<RequireAuth>
							<InStorePage />
						</RequireAuth>
					}
				/>
				<Route
					path="/learn"
					element={
						<RequireAuth>
							<LearnPage />
						</RequireAuth>
					}
				/>
				<Route
					path="/profile"
					element={
						<RequireAuth>
							<ProfilePage />
						</RequireAuth>
					}
				/>
				<Route path="/remedies" element={<Navigate to="/shop" replace />} />

				{/* Catch-all */}
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</Router>
	);
}
