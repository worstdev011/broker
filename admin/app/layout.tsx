import type { Metadata } from "next";
import "./globals.css";
import { AdminAuthProvider } from "@/components/providers/AdminAuthProvider";

export const metadata: Metadata = {
  title: "Comfortrade Admin",
  description: "Comfortrade administration panel",
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-admin-base">
        <AdminAuthProvider>{children}</AdminAuthProvider>
      </body>
    </html>
  );
}
