import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function getApiUrl() {
	const saved = localStorage.getItem("VITE_API_URL");
	if (saved) return saved;
	const env = import.meta.env.REACT_APP_API_URL;
	if (env) return env;
	if (
		window.location.hostname !== "localhost" &&
		window.location.hostname !== "127.0.0.1"
	)
		return window.location.origin;
	return "http://127.0.0.1:5000";
}
