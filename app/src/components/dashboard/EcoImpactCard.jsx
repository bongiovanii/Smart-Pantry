/**
 * Painel de Impacto Ambiental e Sustentabilidade
 * Mostra água desperdiçada (L), emissão de CO2 (kg) e alimentos salvos.
 */
export default function EcoImpactCard({
  waterLiters = 0,
  co2Kg = 0,
  foodSavedKg = 0,
}) {
  const formattedWater = Number(waterLiters || 0).toLocaleString('pt-BR')
  const formattedCo2 = Number(co2Kg || 0).toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
  })
  const formattedSaved = Number(foodSavedKg || 0).toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
  })

  return (
    <div className="surface-card flex h-full flex-col justify-between p-5">
      <div className="border-b border-outline-variant/30 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-primary">
            <span className="material-symbols-outlined text-xl">eco</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-on-surface">
              Impacto Ambiental
            </h3>
            <p className="text-xs text-on-surface-variant">
              Pegada ecológica estimada segundo a FAO
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {/* Água desperdiçada */}
        <div className="flex items-center justify-between rounded-xl bg-surface-container-low/60 p-3.5 transition hover:bg-surface-container-low">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <span className="material-symbols-outlined text-xl">water_drop</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-on-surface">
                Água desperdiçada
              </h4>
              <p className="text-[11px] text-on-surface-variant">
                Pegada hídrica embutida na produção
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-base font-extrabold text-blue-900 sm:text-lg">
              {formattedWater} L
            </span>
          </div>
        </div>

        {/* CO2 gerado */}
        <div className="flex items-center justify-between rounded-xl bg-surface-container-low/60 p-3.5 transition hover:bg-surface-container-low">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <span className="material-symbols-outlined text-xl">cloud</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-on-surface">
                CO₂ gerado
              </h4>
              <p className="text-[11px] text-on-surface-variant">
                Emissões por decomposição em aterros
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-base font-extrabold text-amber-900 sm:text-lg">
              {formattedCo2} kg
            </span>
          </div>
        </div>

        {/* Alimentos aproveitados */}
        <div className="flex items-center justify-between rounded-xl bg-surface-container-low/60 p-3.5 transition hover:bg-surface-container-low">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <span className="material-symbols-outlined text-xl">task_alt</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-on-surface">
                Alimentos aproveitados
              </h4>
              <p className="text-[11px] text-on-surface-variant">
                Consumo eficiente em receitas e lanches
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-base font-extrabold text-primary sm:text-lg">
              {formattedSaved} kg
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-outline-variant/30 bg-surface-container-low/30 p-2.5 text-center text-[11px] text-on-surface-variant">
        💡 <strong>Dica sustentável:</strong> Cada 1 kg de alimento aproveitado
        economiza até 1.250 L de água doce e evita 2,1 kg de gases de efeito
        estufa!
      </div>
    </div>
  )
}
