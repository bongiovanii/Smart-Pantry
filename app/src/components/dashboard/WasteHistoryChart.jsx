import { useState } from 'react'

/**
 * Gráfico combinado de barras + curva de tendência semanal em SVG nativo.
 * Sem bibliotecas externas, leve, acessível e 100% responsivo.
 */
export default function WasteHistoryChart({
  timeline = [],
  title = 'Histórico de Desperdício (kg)',
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const [metricMode, setMetricMode] = useState('waste') // 'waste' ou 'both'

  // Garante ao menos 4 semanas para visualização coerente
  const data = Array.isArray(timeline) && timeline.length > 0
    ? timeline
    : [
        { week_label: 'Sem 01', waste_kg: 0, consumed_kg: 0 },
        { week_label: 'Sem 02', waste_kg: 0, consumed_kg: 0 },
        { week_label: 'Sem 03', waste_kg: 0, consumed_kg: 0 },
        { week_label: 'Sem 04', waste_kg: 0, consumed_kg: 0 },
      ]

  const maxVal = Math.max(
    5,
    ...data.map((d) =>
      metricMode === 'both'
        ? Math.max(Number(d.waste_kg || 0), Number(d.consumed_kg || 0))
        : Number(d.waste_kg || 0),
    ),
  )

  // Arredonda o topo para um múltiplo amigável (5, 10, 15, 20, 25...)
  const yMax = Math.ceil(maxVal / 5) * 5
  const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax]

  const svgWidth = 540
  const svgHeight = 240
  const padLeft = 40
  const padRight = 20
  const padTop = 30
  const padBottom = 35
  const plotWidth = svgWidth - padLeft - padRight
  const plotHeight = svgHeight - padTop - padBottom

  const stepX = plotWidth / data.length
  const barWidth = Math.min(32, stepX * 0.5)

  // Mapeia coordenadas para os pontos da linha de tendência
  const linePoints = data.map((d, i) => {
    const x = padLeft + i * stepX + stepX / 2
    const yVal = Number(d.waste_kg || 0)
    const y = padTop + plotHeight - (yVal / yMax) * plotHeight
    return { x, y, ...d }
  })

  const pathD = linePoints.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`
    // Interpolação suave de Bézier cúbica
    const prev = linePoints[i - 1]
    const cx1 = prev.x + (pt.x - prev.x) / 2
    const cy1 = prev.y
    const cx2 = prev.x + (pt.x - prev.x) / 2
    const cy2 = pt.y
    return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`
  }, '')

  return (
    <div className="surface-card flex h-full flex-col justify-between p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/30 pb-3">
        <div>
          <h3 className="text-base font-bold text-on-surface">{title}</h3>
          <p className="text-xs text-on-surface-variant">
            Volume de descartes acumulado por semana
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-surface-container-low p-1 text-xs">
          <button
            className={`rounded-lg px-2.5 py-1 font-semibold transition ${
              metricMode === 'waste'
                ? 'bg-white text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => setMetricMode('waste')}
            type="button"
          >
            Apenas Desperdício
          </button>
          <button
            className={`rounded-lg px-2.5 py-1 font-semibold transition ${
              metricMode === 'both'
                ? 'bg-white text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => setMetricMode('both')}
            type="button"
          >
            Comparar Consumo
          </button>
        </div>
      </div>

      <div className="relative mt-4 flex-1">
        <svg
          aria-label="Gráfico de histórico de desperdício em quilogramas"
          className="h-64 w-full"
          role="img"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        >
          {/* Linhas de grade horizontais e rótulos do eixo Y */}
          {yTicks.map((tick, i) => {
            const y = padTop + plotHeight - (tick / yMax) * plotHeight
            return (
              <g key={i}>
                <line
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                  x1={padLeft}
                  x2={svgWidth - padRight}
                  y1={y}
                  y2={y}
                />
                <text
                  alignmentBaseline="middle"
                  className="fill-on-surface-variant text-[10px]"
                  textAnchor="end"
                  x={padLeft - 8}
                  y={y}
                >
                  {tick}
                </text>
              </g>
            )
          })}

          {/* Barras por semana */}
          {data.map((d, i) => {
            const centerX = padLeft + i * stepX + stepX / 2
            const wasteKg = Number(d.waste_kg || 0)
            const consumedKg = Number(d.consumed_kg || 0)

            const barHeightWaste = (wasteKg / yMax) * plotHeight
            const barYWaste = padTop + plotHeight - barHeightWaste

            const isHovered = hoveredIdx === i

            return (
              <g
                className="cursor-pointer"
                key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Barra opcional de consumo lado a lado se modo 'both' */}
                {metricMode === 'both' && (
                  <rect
                    className="transition-all duration-150"
                    fill="#154212"
                    height={Math.max(2, (consumedKg / yMax) * plotHeight)}
                    opacity={isHovered ? 0.9 : 0.75}
                    rx="3"
                    width={barWidth * 0.65}
                    x={centerX - barWidth * 0.7}
                    y={padTop + plotHeight - (consumedKg / yMax) * plotHeight}
                  />
                )}

                {/* Barra de desperdício */}
                <rect
                  className="transition-all duration-150"
                  fill="#a2d3a4"
                  height={Math.max(2, barHeightWaste)}
                  opacity={isHovered ? 1 : 0.8}
                  rx="4"
                  stroke={isHovered ? '#154212' : 'none'}
                  strokeWidth="1.5"
                  width={metricMode === 'both' ? barWidth * 0.65 : barWidth}
                  x={
                    metricMode === 'both'
                      ? centerX + 2
                      : centerX - barWidth / 2
                  }
                  y={barYWaste}
                />

                {/* Rótulo da semana no eixo X */}
                <text
                  className="fill-on-surface-variant text-[11px] font-semibold"
                  textAnchor="middle"
                  x={centerX}
                  y={svgHeight - 12}
                >
                  {d.week_label}
                </text>
              </g>
            )
          })}

          {/* Curva de tendência (linha escura conectando os pontos como no mockup) */}
          <path
            d={pathD}
            fill="none"
            stroke="#154212"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          />

          {/* Marcadores circulares na curva */}
          {linePoints.map((pt, i) => (
            <circle
              className="cursor-pointer transition-transform"
              cx={pt.x}
              cy={pt.y}
              fill="#ffffff"
              key={i}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              r={hoveredIdx === i ? 5.5 : 4}
              stroke="#154212"
              strokeWidth="2.5"
            />
          ))}
        </svg>

        {/* Tooltip flutuante interativo */}
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div
            className="pointer-events-none absolute -top-3 z-10 -translate-x-1/2 rounded-xl bg-on-background/95 px-3 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur-xs transition-all"
            style={{
              left: `${
                ((padLeft + hoveredIdx * stepX + stepX / 2) / svgWidth) * 100
              }%`,
            }}
          >
            <div className="font-bold text-tertiary-fixed-dim">
              {data[hoveredIdx].week_label}
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-[#a2d3a4]" />
              <span>Desperdício: {data[hoveredIdx].waste_kg} kg</span>
            </div>
            {data[hoveredIdx].consumed_kg > 0 && (
              <div className="mt-0.5 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                <span>Consumo: {data[hoveredIdx].consumed_kg} kg</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-center gap-6 border-t border-outline-variant/30 pt-3 text-xs text-on-surface-variant">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-[#a2d3a4]" />
          <span>Desperdício semanal (kg)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-4 bg-[#154212]" />
          <span>Curva de tendência</span>
        </div>
        {metricMode === 'both' && (
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-[#154212]" />
            <span>Alimentos consumidos</span>
          </div>
        )}
      </div>
    </div>
  )
}
