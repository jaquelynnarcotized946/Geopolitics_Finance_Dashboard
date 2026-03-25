export default function SeverityBadge({ severity }: { severity: number }) {
  const config =
    severity >= 9
      ? { label: `${severity}`, className: "severity-critical" }
      : severity >= 7
      ? { label: `${severity}`, className: "severity-high" }
      : severity >= 4
      ? { label: `${severity}`, className: "severity-mid" }
      : { label: `${severity}`, className: "severity-low" };

  return <span className={config.className}>{config.label}</span>;
}
