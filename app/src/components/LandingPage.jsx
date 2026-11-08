function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white shadow-sm">
        <span className="material-symbols-outlined text-xl">kitchen</span>
      </div>
      <div>
        <p className="text-base font-bold leading-5 text-primary">Smart Pantry</p>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
          Dispensa Inteligente
        </p>
      </div>
    </div>
  )
}

const features = [
  {
    icon: 'inventory_2',
    title: 'Organize sua despensa',
    description:
      'Cadastre os alimentos da sua casa, acompanhe quantidades, unidades e datas de validade.',
  },
  {
    icon: 'auto_awesome',
    title: 'Receitas com IA',
    description:
      'Receba sugestões de receitas em português que aproveitam os ingredientes que você já tem.',
  },
  {
    icon: 'menu_book',
    title: 'Registre o que cozinhou',
    description:
      'Ao preparar uma receita, o consumo é descontado do estoque e fica salvo no seu histórico.',
  },
]

function LandingPage({ onLogin, onSignUp }) {
  return (
    <div className="min-h-dvh bg-background text-on-background">
      <header className="sticky top-0 z-20 border-b border-outline-variant bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-20 lg:px-8">
          <BrandMark />

          <div className="flex items-center gap-2">
            <button
              className="rounded-xl px-3 py-2 text-sm font-bold text-primary transition hover:bg-surface-container-low sm:px-4"
              onClick={onLogin}
              type="button"
            >
              Entrar
            </button>
            <button
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-container"
              onClick={onSignUp}
              type="button"
            >
              Criar conta
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:pb-24 lg:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-primary">
              <span className="material-symbols-outlined text-base">eco</span>
              Menos desperdício, mais aproveitamento
            </span>

            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-primary sm:text-5xl lg:text-6xl">
              Sua despensa organizada e receitas que aproveitam tudo.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-on-surface-variant sm:text-lg">
              O Smart Pantry ajuda você a acompanhar os alimentos da sua casa,
              evitar perdas por validade e decidir o que cozinhar com o que já
              está disponível.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-container"
                onClick={onSignUp}
                type="button"
              >
                <span className="material-symbols-outlined text-xl">
                  person_add
                </span>
                Criar minha conta
              </button>
              <button
                className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant bg-white px-6 py-3.5 text-sm font-bold text-primary transition hover:bg-surface-container-low"
                onClick={onLogin}
                type="button"
              >
                Já tenho conta
                <span className="material-symbols-outlined text-xl">
                  arrow_forward
                </span>
              </button>
            </div>

            <p className="mt-4 flex items-center gap-1.5 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-base">
                lock
              </span>
              Login seguro com sua conta Google.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-4 rounded-[2rem] bg-secondary-container/60 blur-2xl" />

            <div className="surface-card relative overflow-hidden p-4 sm:p-5">
              <div className="flex items-center justify-between border-b border-outline-variant/50 pb-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary/70">
                    Minha despensa
                  </p>
                  <p className="mt-1 text-lg font-bold text-primary">
                    Em estoque agora
                  </p>
                </div>
                <span className="rounded-full bg-secondary-container px-2.5 py-1 text-xs font-bold text-primary">
                  4 itens
                </span>
              </div>

              <ul className="mt-3 space-y-2">
                {[
                  ['Tomate', '6 un', 'vence em 2 dias'],
                  ['Arroz', '1,5 kg', 'validade em 8 meses'],
                  ['Feijão', '500 g', 'validade em 5 meses'],
                  ['Queijo', '200 g', 'vence em 4 dias'],
                ].map(([name, quantity, detail]) => (
                  <li
                    className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/60 bg-white p-3"
                    key={name}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-on-surface">
                        {name}
                      </p>
                      <p className="mt-0.5 text-xs text-on-surface-variant">
                        {detail}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-primary">
                      {quantity}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex items-start gap-3 rounded-xl bg-primary p-3.5 text-white">
                <span className="material-symbols-outlined text-xl">
                  auto_awesome
                </span>
                <div>
                  <p className="text-xs font-bold">Sugestão para hoje</p>
                  <p className="mt-0.5 text-sm leading-5 text-white/85">
                    Macarrão com tomate, queijo e manjericão
                  </p>
                </div>
              </div>
            </div>

            <span className="absolute -bottom-5 -left-3 hidden items-center gap-2 rounded-xl border border-outline-variant bg-white px-3 py-2 text-xs font-bold text-primary shadow-lg sm:flex">
              <span className="material-symbols-outlined text-lg text-emerald-600">
                check_circle
              </span>
              Consumo registrado
            </span>
          </div>
        </section>

        <section className="border-y border-outline-variant/60 bg-white">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8 lg:py-16">
            {features.map((feature) => (
              <article className="rounded-2xl p-5" key={feature.title}>
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-secondary-container text-primary">
                  <span className="material-symbols-outlined">
                    {feature.icon}
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-bold text-primary">
                  {feature.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6 lg:px-8 lg:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Comece a aproveitar melhor seus alimentos.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-on-surface-variant">
            Crie sua conta gratuitamente e transforme os ingredientes da sua
            despensa em refeições práticas.
          </p>
          <button
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-container"
            onClick={onSignUp}
            type="button"
          >
            <span className="material-symbols-outlined text-xl">
              person_add
            </span>
            Criar conta com Google
          </button>
        </section>
      </main>

      <footer className="border-t border-outline-variant bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <BrandMark />
          <p className="text-xs text-on-surface-variant">
            Projeto acadêmico · ODS 12 — Consumo e produção responsáveis
          </p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
