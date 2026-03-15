import {
	createBrowserRouter,
	Navigate,
	RouterProvider,
} from "react-router-dom";
import { PublicLayout } from "./layouts/public-layout";
import { AppLayout } from "./layouts/app-layout";

import LandingPage from "./pages/LandingPage";
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

const router = createBrowserRouter([
	{
		element: <PublicLayout />,
		children: [
			{ path: "/", element: <LandingPage /> },
			{ path: "/login", element: <AuthPage /> },
		],
	},
	{
		element: <AppLayout />,
		children: [
			{ path: "/dashboard", element: <HomePage /> },
			{ path: "/scan", element: <ScanPage /> },
			{ path: "/results", element: <ResultsPage /> },
			{ path: "/chat", element: <KeraChatPage /> },
			{ path: "/weekly", element: <WeeklyCheckPage /> },
			{ path: "/shop", element: <ShopPage /> },
			{ path: "/instore", element: <InStorePage /> },
			{ path: "/learn", element: <LearnPage /> },
			{ path: "/profile", element: <ProfilePage /> },
		],
	},
	{ path: "/auth", element: <Navigate to="/login" replace /> },
	{ path: "/remedies", element: <Navigate to="/shop" replace /> },
	{ path: "*", element: <Navigate to="/" replace /> },
]);

export default function App() {
	return <RouterProvider router={router} />;
}
