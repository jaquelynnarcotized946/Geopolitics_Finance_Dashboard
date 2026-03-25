import Sparkline from "./Sparkline";

const toneColors: Record<string, string> = {
  teal: "text-emerald",
  amber: "text-amber-400",
  coral: "text-red-400",
  ocean: "text-blue-400",
};

export default function MetricCard({
  label,
  value,
  trend,
  sparkline,
  tone = "teal",
}: {
  label: string;
  value: string;
  trend?: string;
  icon?: React.ReactNode;
  sparkline?: number[];
  tone?: "teal" | "amber" | "coral" | "ocean";
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0A0A0A] p-4">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <p className={`text-2xl font-bold ${toneColors[tone]}`}>{value}</p>
          {trend && <p className="mt-0.5 text-[11px] text-zinc-600">{trend}</p>}
        </div>
        {sparkline && (
          <div className={`w-16 ${toneColors[tone]}`}>
            <Sparkline data={sparkline} />
          </div>
        )}
      </div>
    </div>
  );
}
