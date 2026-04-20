export function SoldOverlay({ label = "SOLD" }: { label?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="rotate-[-20deg] rounded border-4 border-red-500 bg-red-500/10 px-3 py-1 text-lg font-bold tracking-widest text-red-600">
        {label}
      </div>
    </div>
  );
}
