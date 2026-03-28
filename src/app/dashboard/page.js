"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("wc_token");
    if (!token) {
      router.replace("/");
      return;
    }
    setReady(true);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("wc_token");
    router.replace("/");
  };

  if (!ready) return null;

  return (
    <div className="flex flex-col flex-1">
      <header className="sticky top-0 z-20 glass border-b border-border-subtle px-6 py-4 flex items-center justify-between">
        <span className="text-lg font-bold text-dark">WellCheck GH</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors"
        >
          <LogOut size={16} />
          Log out
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-lg mx-auto w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-dark tracking-tight">
            Welcome to WellCheck GH
          </h1>
          <p className="text-text-secondary text-sm">
            Your dashboard is being built. Check back soon.
          </p>
        </div>
      </main>
    </div>
  );
}
