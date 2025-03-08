// Ensure dynamic rendering to avoid server-side errors
export { dynamic } from './dynamic';

// Server Component for admin layout
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>{children}</>
  );
}