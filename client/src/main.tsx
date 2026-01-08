import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Initialize theme before rendering to prevent flash
const initTheme = () => {
  const stored = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  // Default to dark mode (Linear style) unless explicitly set to light
  const isDark = stored === "light" ? false : (stored === "dark" || prefersDark || true);

  document.documentElement.classList.toggle("dark", isDark);
};

initTheme();

createRoot(document.getElementById("root")!).render(<App />);
