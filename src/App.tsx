import { useEffect } from "react";
import Dashboard from "./components/Dashboard";

export default function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Dashboard />
    </div>
  );
}
