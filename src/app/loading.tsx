export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-rock-800" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-rock-900/60" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-rock-900/60" />
    </div>
  );
}
