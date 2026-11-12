/**
 * Card de métrica / KPI do Dashboard de Consumo
 * Estilizado de acordo com o design system do Smart Pantry e referências.
 */
export default function DashboardKpiCard({
  icon,
  iconBg = 'bg-emerald-100 text-emerald-800',
  title,
  value,
  badgeText = '',
  badgeType = 'neutral',
  subtext = '',
}) {
  const badgeClasses = {
    positive: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    negative: 'bg-red-100 text-red-800 border-red-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    neutral: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  }[badgeType] || 'bg-zinc-100 text-zinc-700 border-zinc-200'

  return (
    <div className="surface-card flex flex-col justify-between p-5 transition hover:shadow-md">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconBg}`}
        >
          <span className="material-symbols-outlined text-2xl">{icon}</span>
        </div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          {title}
        </h4>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold tracking-tight text-on-surface sm:text-3xl">
            {value}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {badgeText && (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.7rem] font-bold ${badgeClasses}`}
            >
              {badgeText}
            </span>
          )}
          {subtext && (
            <span className="text-xs text-on-surface-variant">{subtext}</span>
          )}
        </div>
      </div>
    </div>
  )
}
