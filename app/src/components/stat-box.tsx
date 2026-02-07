export function StatBox({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label}
      </span>
      <span className="text-2xl font-bold mt-1">{value}</span>
      {sub && (
        <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</span>
      )}
    </div>
  );
}
