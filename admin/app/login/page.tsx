"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { adminApi, clearCsrfToken } from "@/lib/api/admin-api";
import type { AdminUser } from "@/types/admin";

interface LoginResponse {
  user: AdminUser & { role: string };
  csrfToken: string;
  requires2FA?: boolean;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Login is CSRF-exempt on the backend
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/auth/login`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );

      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        setError(body.message ?? "Invalid credentials");
        return;
      }

      const data = (await res.json()) as LoginResponse;

      if (data.requires2FA) {
        setError("2FA is not yet supported in admin panel");
        return;
      }

      if (data.user.role !== "ADMIN") {
        setError("Access denied: not an admin");
        return;
      }

      // Seed CSRF token from login response
      clearCsrfToken();
      router.replace("/dashboard");
    } catch {
      setError("Connection error. Check your network.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-admin-base">
      <div className="w-full max-w-sm rounded-xl border border-admin-border bg-admin-surface p-8 shadow-2xl">
        <h1 className="mb-2 text-center text-xl font-semibold text-admin-primary">
          Comfortrade
        </h1>
        <p className="mb-8 text-center text-sm text-admin-secondary">
          Admin panel
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-admin-secondary">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-admin-border bg-admin-base px-3 py-2.5 text-sm text-admin-primary placeholder-admin-muted outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
              placeholder="admin@comfortrade.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-admin-secondary">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-admin-border bg-admin-base px-3 py-2.5 text-sm text-admin-primary placeholder-admin-muted outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
