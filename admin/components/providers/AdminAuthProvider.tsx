"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { adminApi, clearCsrfToken } from "@/lib/api/admin-api";
import type { AdminUser } from "@/types/admin";

// ─── Context ──────────────────────────────────────────────────────────────────

interface AdminAuthContextValue {
  admin: AdminUser | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface MeResponse {
  user: AdminUser & { role: string };
}

export function AdminAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    adminApi
      .get<MeResponse>("/api/auth/me")
      .then(({ user }) => {
        if (user.role !== "ADMIN") {
          router.replace("/login");
          return;
        }
        setAdmin(user as AdminUser);
      })
      .catch(() => {
        router.replace("/login");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await adminApi.post("/api/auth/logout", {});
    } catch {
      // proceed with local cleanup regardless
    }
    clearCsrfToken();
    setAdmin(null);
    router.replace("/login");
  }, [router]);

  return (
    <AdminAuthContext.Provider value={{ admin, isLoading, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
