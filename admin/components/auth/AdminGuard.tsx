"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/components/providers/AdminAuthProvider";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { admin, isLoading } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !admin) {
      router.replace("/login");
    }
  }, [admin, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-admin-base">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-admin-border border-t-accent" />
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return <>{children}</>;
}
