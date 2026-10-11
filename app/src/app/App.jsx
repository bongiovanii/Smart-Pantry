import { useState } from 'react'
import AppHeader from '../components/AppHeader.jsx'
import FeatureCard from '../components/FeatureCard.jsx'

const recipes = [
  {
    title: 'Massa clássica de tomate',
    time: '25 min',
    ingredients: '3 de 4 ingredientes',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB8N-Tljzk9MEdDklh6lA-4KEIu1dgmySFkKc5qAd9ffcFIVlPV1zwLJZfw_EF_n-pM5xZBVEy7CM6AaKnSikL7gyoJo5HCZkZeuGCXbnwZxQ-_myw_4A9OOKrodD4a8OtxOnFFGMm0Yed_K0TrCi_1ty6Sde4RU1KBPJkfkYrOCcWR560Ozsis85C4s8ohqBYpdSG93uXDhAnjyoAsHUtsQfuJr2dJ2OzFj8VV_Ci21pi87o8dXKYkErodcF3e_y6ZWmbSiuChhEM',
  },
  {
    title: 'Salada de jardim fresca',
    time: '10 min',
    ingredients: '4 de 5 ingredientes',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDrMuL9YdkeNrgozbu53ZpGzy9UB9sltVyNs2S5aqx4neIWBEzsskYPdEUP_5M632dK5WbNXdlQEImeDJ1MJfmF-HCVUZMz8YqYCq_BleAWNmMiShQbqCmq3LPOWFiD2nvjN-j8pxYJC0pTGgp_qhdbiAB_z0mKTj_fExh_sk-iX0q5HiUFk3dfzJsW3JGeAr7X5vOtQWN4y4G-SK74y-Odl6CDybOjsYIL4lDosau3uPb3j1QlW4XYDHyqcohVDlIA2-ofNuVR4FM',
  },
]

const week = [
  { day: 'SEG', meal: 'Macarrão com tomate e manjericão', type: 'Jantar' },
  { day: 'TER' },
  { day: 'QUA' },
  { day: 'QUI' },
  { day: 'SEX' },
  { day: 'SÁB', meal: 'Salada de jardim', type: 'Almoço' },
  { day: 'DOM' },
]

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-outline-variant bg-white p-6 lg:flex">
      <div className="mb-10 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-secondary-container text-primary">
          <span className="material-symbols-outlined">person</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-primary">Gerente de cozinha</p>
          <p className="truncate text-xs text-on-surface-variant">Minha casa</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2" aria-label="Navegação principal">
        <a className="side-link side-link-active" href="#despensa">
          <span className="material-symbols-outlined">kitchen</span>
          Minha despensa
        </a>
        <a className="side-link" href="#receitas">
          <span className="material-symbols-outlined">restaurant_menu</span>
          Receitas
        </a>
        <a className="side-link" href="#planejamento">
          <span className="material-symbols-outlined">calendar_month</span>
          Planejamento
        </a>
        <a className="side-link" href="#configuracoes">
          <span className="material-symbols-outlined">settings</span>
          Configurações
        </a>
      </nav>

      <button className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-container">
        <span className="material-symbols-outlined text-xl">add</span>
        Novo ingrediente
      </button>
    </aside>
  )
}

function MobileNavigation() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-outline-variant bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_18px_rgba(25,28,27,0.08)] lg:hidden">
      <a className="mobile-nav-item mobile-nav-active" href="#despensa">
        <span className="material-symbols-outlined">kitchen</span>
        <span>Despensa</span>
      </a>
      <a className="mobile-nav-item" href="#receitas">
        <span className="material-symbols-outlined">restaurant_menu</span>
        <span>Receitas</span>
      </a>
      <a className="mobile-nav-item" href="#planejamento">
        <span className="material-symbols-outlined">calendar_month</span>
        <span>Planejar</span>
      </a>
      <a className="mobile-nav-item" href="#configuracoes">
        <span className="material-symbols-outlined">settings</span>
        <span>Ajustes</span>
      </a>
    </nav>
  )
}

function App() {
  const [ingredients, setIngredients] = useState(['Banana', 'Maçã', 'Pão', 'Leite'])
  const [newIngredient, setNewIngredient] = useState('')

  function addIngredient(event) {
    event.preventDefault()
    const value = newIngredient.trim()

    if (!value) return

    setIngredients((current) => [...current, value])
    setNewIngredient('')
  }

  return (
    <div className="min-h-dvh bg-background text-on-background">
      <Sidebar />

      <div className="min-h-dvh lg:ml-64">
        <AppHeader />

        <main className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-5 sm:px-6 lg:px-12 lg:pb-12 lg:pt-8">
          <section id="despensa" className="grid gap-4 lg:grid-cols-3 lg:gap-6">
            <article className="surface-card flex flex-col justify-center p-5 sm:p-6">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
                Minha despensa
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-primary">
                Adicionar ingrediente rápido
              </h1>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Registre os alimentos da sua casa e mantenha o estoque atualizado.
              </p>

              <form className="mt-5 flex gap-2" onSubmit={addIngredient}>
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">Nome do ingrediente</span>
                  <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl text-primary/70">
                    search
                  </span>
                  <input
                    className="w-full rounded-full border border-tertiary-fixed-dim bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    placeholder="Ex.: Alho"
                    type="text"
                    value={newIngredient}
                    onChange={(event) => setNewIngredient(event.target.value)}
                  />
                </label>
                <button
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-white transition hover:bg-primary-container"
                  type="submit"
                  aria-label="Adicionar ingrediente"
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
              </form>
            </article>

            <article className="surface-card p-5 sm:p-6 lg:col-span-2">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
                    Inventário
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-primary">Em estoque agora</h2>
                </div>
                <button className="shrink-0 text-sm font-bold text-primary hover:underline">
                  Ver tudo
                </button>
              </div>

              <div className="flex flex-wrap gap-2" aria-live="polite">
                {ingredients.map((ingredient, index) => (
                  <span
                    className="rounded-full border border-secondary-container bg-secondary-container px-3 py-2 text-sm font-semibold text-primary transition hover:border-primary/30"
                    key={`${ingredient}-${index}`}
                  >
                    {ingredient}
                  </span>
                ))}
              </div>
            </article>
          </section>

          <section id="receitas" className="mt-9 lg:mt-12">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
                  Aproveite o que você tem
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                  Receitas sugeridas
                </h2>
              </div>
              <span className="hidden rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-on-surface-variant sm:inline-block">
                Com base na despensa
              </span>
            </div>

            <div className="recipe-grid">
              {recipes.map((recipe) => (
                <FeatureCard key={recipe.title} {...recipe} />
              ))}

              <article className="surface-card min-h-56 overflow-hidden">
                <div className="grid aspect-video place-items-center bg-surface-container-low">
                  <span className="material-symbols-outlined text-5xl text-outline">soup_kitchen</span>
                </div>
                <div className="space-y-3 p-4" aria-hidden="true">
                  <div className="h-4 w-3/4 rounded bg-surface-container" />
                  <div className="h-3 w-1/2 rounded bg-surface-container" />
                </div>
              </article>

              <button className="surface-card flex min-h-56 flex-col items-center justify-center border-dashed p-5 text-primary transition hover:bg-surface-container-low">
                <span className="material-symbols-outlined mb-2 text-3xl">explore</span>
                <span className="text-sm font-bold">Descobrir mais receitas</span>
              </button>
            </div>
          </section>

          <section id="planejamento" className="mt-9 lg:mt-12">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
                Sua semana
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                Planejamento semanal
              </h2>
            </div>

            <div className="week-grid">
              {week.map(({ day, meal, type }) => (
                <article className="day-column" key={day}>
                  <p className="border-b border-primary/10 pb-2 text-center text-xs font-bold tracking-widest text-on-surface-variant">
                    {day}
                  </p>
                  {meal ? (
                    <button className="flex min-h-24 flex-1 flex-col justify-between rounded-xl border border-secondary-container bg-secondary-container/50 p-3 text-left transition hover:border-primary/40">
                      <span className="text-sm font-semibold leading-5">{meal}</span>
                      <span className="mt-3 text-xs font-bold text-primary">{type}</span>
                    </button>
                  ) : (
                    <button
                      className="grid min-h-24 flex-1 place-items-center rounded-xl border border-dashed border-outline-variant bg-surface text-outline transition hover:bg-surface-container-low hover:text-primary"
                      aria-label={`Adicionar refeição para ${day}`}
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>

      <MobileNavigation />
    </div>
  )
}

export default App
