export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b p-4">
        <p className="text-sm text-muted-foreground">Header (Phase 2)</p>
      </header>
      <main>{children}</main>
    </div>
  );
}
