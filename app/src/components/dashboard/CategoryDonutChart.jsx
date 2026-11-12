import { useState } from 'react'
import { CATEGORY_CHART_COLORS } from '../../lib/consumptionMetrics.js'

/**
 * Gráfico Donut em SVG nativo para visualização das categorias mais desperdiçadas.
 */
export default function CategoryDonutChart({
  categories = [],
  title = 'Principais Categorias Desperdiçadas',
}) {
  const [hoveredCategory, setHoveredCategory] = useState(null)

  const activeCategories = Array.isArray(categories) && categories.length > 0
    ? categories.filter((c) => Number(c.percentage || 0) > 0 || Number(c.kg || 0) > 0)
    : []

  const totalKg = activeCategories.reduce(
    (acc, c) => acc + Number(c.kg || 0),
    0,
  )

  // Geometria do Donut SVG
  const radius = 60
  const strokeWidth = 24
  const circumference = 2 * Math.PI * radius

  const slices = activeCategories.map((cat, idx) => {
    const pct = Math.max(0, Number(cat.percentage || 0))
    const offsetPercent = activeCategories
      .slice(0, idx)
      .reduce((sum, item) => sum + Math.max(0, Number(item.percentage || 0)), 0)
    const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`
    const strokeDashoffset = -((offsetPercent / 100) * circumference)

    const color =
      cat.color || CATEGORY_CHART_COLORS[cat.category] || CATEGORY_CHART_COLORS.outros

    return {
      ...cat,
      pct,
      color,
      strokeDasharray,
      strokeDashoffset,
    }
  })

  return (
    <div className="surface-card flex h-full flex-col justify-between p-5">
      <div className="border-b border-outline-variant/30 pb-3">
        <h3 className="text-base font-bold text-on-surface">{title}</h3>
        <p className="text-xs text-on-surface-variant">
          Distribuição proporcional por categoria
        </p>
      </div>

      {activeCategories.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant">
            <span className="material-symbols-outlined text-2xl">pie_chart</span>
          </div>
          <p className="mt-3 text-sm font-semibold text-on-surface">
            Nenhum descarte registrado
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">
            Nenhum desperdício foi contabilizado no período selecionado.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-around">
          {/* Gráfico Donut SVG */}
          <div className="relative flex shrink-0 items-center justify-center">
            <svg
              className="h-44 w-44 -rotate-90 transform"
              viewBox="0 0 160 160"
            >
              {/* Círculo de fundo cinza sutil */}
              <circle
                cx="80"
                cy="80"
                fill="none"
                r={radius}
                stroke="#eceeec"
                strokeWidth={strokeWidth}
              />
              {/* Fatias das categorias */}
              {slices.map((slice, i) => (
                <circle
                  className="cursor-pointer transition-all duration-300"
                  cx="80"
                  cy="80"
                  fill="none"
                  key={i}
                  onMouseEnter={() => setHoveredCategory(slice)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  opacity={
                    hoveredCategory && hoveredCategory.category !== slice.category
                      ? 0.4
                      : 1
                  }
                  r={radius}
                  stroke={slice.color}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  strokeWidth={
                    hoveredCategory?.category === slice.category
                      ? strokeWidth + 4
                      : strokeWidth
                  }
                />
              ))}
            </svg>

            {/* Conteúdo central do Donut */}
            <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center">
              <span className="text-xl font-extrabold text-on-surface">
                {hoveredCategory
                  ? `${hoveredCategory.percentage}%`
                  : `${Math.round(totalKg * 10) / 10} kg`}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                {hoveredCategory ? hoveredCategory.label : 'Descartado'}
              </span>
            </div>
          </div>

          {/* Legenda com percentuais */}
          <div className="w-full space-y-2 sm:max-w-xs">
            {slices.map((slice, i) => (
              <div
                className={`flex cursor-pointer items-center justify-between rounded-lg p-1.5 transition ${
                  hoveredCategory?.category === slice.category
                    ? 'bg-surface-container-low font-bold'
                    : 'hover:bg-surface-container-low/50'
                }`}
                key={i}
                onMouseEnter={() => setHoveredCategory(slice)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="text-xs text-on-surface">{slice.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-on-surface">
                    {slice.percentage}%
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    ({slice.kg} kg)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
