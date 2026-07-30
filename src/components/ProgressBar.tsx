export function ProgressBar({
  value,
  max,
  height = 3,
  widthPx,
}: {
  value: number;
  max: number;
  height?: number;
  widthPx?: number;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div
      className="progress-track"
      style={{ height, maxWidth: widthPx ?? undefined }}
    >
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
