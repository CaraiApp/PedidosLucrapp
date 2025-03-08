'use client';

// Import all configuration to ensure section is fully client-side only
export * from './config';

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