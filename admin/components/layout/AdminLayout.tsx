import { AdminGuard } from "@/components/auth/AdminGuard";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminTopBar } from "@/components/layout/AdminTopBar";

interface AdminLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function AdminLayout({ title, children }: AdminLayoutProps) {
  return (
    <AdminGuard>
      <div className="flex h-screen overflow-hidden bg-admin-base">
        {/* Left sidebar */}
        <AdminSidebar />

        {/* Right: topbar + scrollable content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <AdminTopBar title={title} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}
