export function TrendBars({
  data,
  tone = "teal"
}: {
  data: Array<{ label: string; value: number }>;
  tone?: "teal" | "coral" | "ink";
}) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const toneClass = tone === "coral" ? "bg-[var(--coral)]" : tone === "ink" ? "bg-[var(--ink)]" : "bg-[var(--teal)]";

  return (
    <div className="space-y-3">
      <div className="flex h-44 items-end gap-2 rounded-3xl bg-white p-4">
        {data.map((item) => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
            <div className={`w-full rounded-t-2xl ${toneClass}`} style={{ height: `${Math.max(8, (item.value / max) * 100)}%` }} />
            <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">{item.label.slice(5)}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-[var(--muted)]">
        {data.map((item) => (
          <span key={`${item.label}-value`} className="rounded-full border border-[var(--line)] px-3 py-1">
            {item.label}: {item.value}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DistributionGrid({
  title,
  values
}: {
  title?: string;
  values: Record<string, number>;
}) {
  return (
    <div className="space-y-3">
      {title ? <p className="text-sm text-[var(--muted)]">{title}</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(values).map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4">
            <p className="text-sm text-[var(--muted)]">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
