'use client';

// Ensure dynamic rendering to avoid server-side errors
export const dynamic = 'force-dynamic';

// Client Component for admin layout to ensure Auth provider works
import { AdminAuthProvider } from "./auth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      {children}
    </AdminAuthProvider>
  );
}