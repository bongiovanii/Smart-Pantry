import { useState } from 'react'

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

function BrandHeaderLogo() {
  const [imgError, setImgError] = useState(false)

  if (imgError) {
    return (
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white shadow-sm">
          <span className="material-symbols-outlined text-xl">nest_eco_leaf</span>
        </div>
        <div>
          <p className="text-base font-bold leading-5 text-primary">Smart Pantry</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
            Despensa Inteligente
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <img
        src="/logo-smart-pantry.png"
        alt="Smart Pantry - Despensa Inteligente"
        className="h-10 sm:h-12 w-auto object-contain"
        onError={() => setImgError(true)}
      />
    </div>
  )
}

function LandingPage({ onLogin, onSignUp }) {
  return (
    <div className="min-h-dvh flex flex-col bg-[#FBFBF7] text-[#1E2520]">
      {/* Top Banner ODS 12 */}
      <aside aria-label="Aviso sustentabilidade" className="bg-[#154212] px-4 py-2.5 text-center text-xs text-[#E1EFE1]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#244528] px-2.5 py-0.5 text-[11px] font-semibold text-[#A2D3A4]">
            <span className="material-symbols-outlined text-sm">eco</span> ODS 12 ONU
          </span>
          <span>
            Cozinha consciente: lares que utilizam o Smart Pantry reduzem em até{' '}
            <strong className="text-white">84%</strong> o descarte de alimentos.
          </span>
          <a
            href="#impacto"
            className="ml-1 font-semibold text-[#A2D3A4] underline hover:text-white"
          >
            Ver dados de impacto &rarr;
          </a>
        </div>
      </aside>

      {/* Navigation */}
      <header className="sticky top-0 z-30 border-b border-[#E8EAE6] bg-[#FBFBF7]/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <BrandHeaderLogo />

          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#42493E] md:flex">
            <a href="#como-funciona" className="transition hover:text-primary">
              Como Funciona
            </a>
            <a href="#receitas" className="transition hover:text-primary">
              Receitas Zero-Waste
            </a>
            <a href="#impacto" className="transition hover:text-primary">
              Impacto Sustentável
            </a>
            <a href="#manifesto" className="transition hover:text-primary">
              Nosso Manifesto
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              className="rounded-xl px-3 py-2 text-sm font-bold text-primary transition hover:bg-secondary-container/50 sm:px-4"
              onClick={onLogin}
              type="button"
            >
              Entrar
            </button>
            <button
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-container"
              onClick={onSignUp}
              type="button"
            >
              <span>Criar Conta</span>
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden pb-16 pt-10 sm:pb-24 sm:pt-16 lg:pb-28 lg:pt-20">
          <div className="pointer-events-none absolute left-1/2 top-10 -z-10 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-secondary-container/40 blur-3xl" />
          <div className="pointer-events-none absolute bottom-10 right-10 -z-10 h-[360px] w-[400px] rounded-full bg-amber-100/35 blur-3xl" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
              {/* Left Column (7 cols) */}
              <div className="space-y-6 lg:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-secondary-container bg-secondary-container/60 px-3.5 py-1.5 text-xs font-bold text-primary">
                  <span className="material-symbols-outlined text-base text-primary">
                    nest_eco_leaf
                  </span>
                  Feito com carinho para cozinhas reais
                </div>

                <h1
                  className="text-4xl font-bold tracking-tight text-[#154212] sm:text-5xl lg:text-6xl"
                  style={{ fontFamily: 'Fraunces, serif', lineHeight: 1.12 }}
                >
                  Sua despensa sem desperdício.{' '}
                  <span className="italic font-medium text-[#2D5A27]">
                    Mais sabor, economia
                  </span>{' '}
                  e respeito à terra.
                </h1>

                <p className="max-w-2xl text-base leading-relaxed text-[#42493E] sm:text-lg">
                  O <strong>Smart Pantry</strong> transforma sobras e ingredientes
                  esquecidos em pratos acolhedores. Acompanhe a validade dos
                  alimentos, gere receitas inteligentes adaptadas ao que você já tem
                  em casa e veja o impacto positivo do seu lar no planeta.
                </p>

                {/* CTAs */}
                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                  <button
                    className="inline-flex items-center justify-center gap-3 rounded-2xl bg-primary px-7 py-4 text-base font-bold text-white shadow-md transition hover:bg-primary-container hover:shadow-lg"
                    onClick={onSignUp}
                    type="button"
                  >
                    <GoogleIcon />
                    <span>Cadastrar Grátis com Google</span>
                  </button>

                  <a
                    href="#como-funciona"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-outline-variant/60 bg-white px-6 py-4 text-base font-bold text-primary transition hover:bg-[#F2F4F2]"
                  >
                    <span>Ver Como Funciona</span>
                    <span className="material-symbols-outlined text-lg">
                      arrow_downward
                    </span>
                  </a>
                </div>

                {/* Trust Badges */}
                <div className="flex flex-wrap items-center gap-6 pt-3 text-xs text-[#556358]">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-base text-primary">
                      verified_user
                    </span>
                    <span>100% Gratuito & Seguro</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-base text-primary">
                      psychology
                    </span>
                    <span>IA que valoriza a culinária caseira</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-base text-primary">
                      water_drop
                    </span>
                    <span>Métricas FAO & Water Footprint</span>
                  </div>
                </div>
              </div>

              {/* Right Column (5 cols) */}
              <div className="relative lg:col-span-5">
                <div className="relative mx-auto max-w-md lg:max-w-none">
                  {/* Photo Frame */}
                  <div className="relative overflow-hidden rounded-3xl border-4 border-white shadow-2xl">
                    <img
                      src="/hero-human-salad.jpg"
                      alt="Alimentação saudável e consciente em luz natural"
                      className="h-[440px] w-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#154212]/80 via-transparent to-transparent" />
                    <div className="absolute bottom-5 left-5 right-5 text-white">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-secondary-container">
                        Cozinha viva & sustentável
                      </p>
                      <p
                        className="mt-1 text-lg font-bold leading-snug"
                        style={{ fontFamily: 'Fraunces, serif' }}
                      >
                        &quot;Aproveitar cada alimento é um gesto de amor com a
                        casa e o planeta.&quot;
                      </p>
                    </div>
                  </div>

                  {/* Floating Card 1: Zero Desperdício Hoje */}
                  <div className="absolute -left-6 -top-6 hidden max-w-[240px] rounded-2xl border border-white/80 bg-white/90 p-4 shadow-xl backdrop-blur-md sm:block">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary-container text-primary">
                        <span className="material-symbols-outlined text-xl">
                          soup_kitchen
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-primary">
                          Aproveitamento Total
                        </p>
                        <p className="text-[11px] text-on-surface-variant">
                          Receitas criadas com sobras de arroz e talos
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Floating Card 2: Impacto Ecológico */}
                  <div className="absolute -bottom-6 -right-6 max-w-[250px] rounded-2xl border border-white/80 bg-white/95 p-4 shadow-xl backdrop-blur-md">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
                        <span className="material-symbols-outlined text-xl">
                          water_drop
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-primary">
                          15.000 L de Água
                        </p>
                        <p className="text-[11px] text-on-surface-variant">
                          Poupados por famílias ativas neste mês
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats & Sustainability Ribbon (Inspired by References 5 & 6) */}
        <section id="impacto" className="relative bg-[#154212] py-12 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-8 divide-y divide-[#244528] md:grid-cols-4 md:divide-x md:divide-y-0">
              <div className="px-4 pt-4 text-center md:pt-0">
                <div className="mb-1 flex items-center justify-center gap-1.5 text-secondary-container">
                  <span className="material-symbols-outlined text-xl">water_drop</span>
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Água Poupada
                  </span>
                </div>
                <p
                  className="text-3xl font-bold sm:text-4xl lg:text-5xl"
                  style={{ fontFamily: 'Fraunces, serif' }}
                >
                  15.000 L
                </p>
                <p className="mt-1 text-xs text-secondary-container/80">
                  por família/ano em média
                </p>
              </div>

              <div className="px-4 pt-4 text-center md:pt-0">
                <div className="mb-1 flex items-center justify-center gap-1.5 text-secondary-container">
                  <span className="material-symbols-outlined text-xl">
                    delete_sweep
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Menos Lixo
                  </span>
                </div>
                <p
                  className="text-3xl font-bold sm:text-4xl lg:text-5xl"
                  style={{ fontFamily: 'Fraunces, serif' }}
                >
                  -84%
                </p>
                <p className="mt-1 text-xs text-secondary-container/80">
                  redução no descarte de comida
                </p>
              </div>

              <div className="px-4 pt-4 text-center md:pt-0">
                <div className="mb-1 flex items-center justify-center gap-1.5 text-secondary-container">
                  <span className="material-symbols-outlined text-xl">payments</span>
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Economia Real
                  </span>
                </div>
                <p
                  className="text-3xl font-bold sm:text-4xl lg:text-5xl"
                  style={{ fontFamily: 'Fraunces, serif' }}
                >
                  R$ 380
                </p>
                <p className="mt-1 text-xs text-secondary-container/80">
                  economizados por mês no mercado
                </p>
              </div>

              <div className="px-4 pt-4 text-center md:pt-0">
                <div className="mb-1 flex items-center justify-center gap-1.5 text-secondary-container">
                  <span className="material-symbols-outlined text-xl">eco</span>
                  <span className="text-xs font-bold uppercase tracking-wider">
                    ODS 12 ONU
                  </span>
                </div>
                <p
                  className="text-3xl font-bold sm:text-4xl lg:text-5xl"
                  style={{ fontFamily: 'Fraunces, serif' }}
                >
                  100%
                </p>
                <p className="mt-1 text-xs text-secondary-container/80">
                  alinhado a metas de consumo responsável
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works (3 Human Pillars) */}
        <section id="como-funciona" className="bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl space-y-4 text-center">
              <span className="rounded-full bg-secondary-container px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-primary">
                Simplicidade & Cuidado
              </span>
              <h2
                className="text-3xl font-bold text-primary sm:text-4xl lg:text-5xl"
                style={{ fontFamily: 'Fraunces, serif' }}
              >
                Como o Smart Pantry cuida da sua rotina
              </h2>
              <p className="text-base text-on-surface-variant sm:text-lg">
                Sem burocracias ou planilhas difíceis. Uma ferramenta intuitiva
                pensada para o dia a dia de quem cozinha em casa.
              </p>
            </div>

            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {/* Pillar 1 */}
              <article className="flex flex-col justify-between rounded-3xl border border-outline-variant/60 bg-[#FBFBF7] p-6 transition hover:-translate-y-1 hover:shadow-lg">
                <div>
                  <div className="mb-6 h-48 overflow-hidden rounded-2xl border border-outline-variant/40">
                    <img
                      src="/fresh-kitchen-ingredients.jpg"
                      alt="Ingredientes frescos em vidros e sacolas ecológicas"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    1
                  </div>
                  <h3
                    className="mb-2 text-xl font-bold text-primary"
                    style={{ fontFamily: 'Fraunces, serif' }}
                  >
                    Despensa Clara & Visual
                  </h3>
                  <p className="text-sm leading-relaxed text-on-surface-variant">
                    Cadastre suas compras em segundos com fotos, preços e
                    validades. O sistema destaca automaticamente os alimentos que
                    precisam de atenção primeiro.
                  </p>
                </div>
                <div className="mt-6 flex items-center border-t border-outline-variant/40 pt-4 text-xs font-semibold text-primary">
                  <span className="material-symbols-outlined mr-1 text-base">
                    timer
                  </span>
                  Alertas amigáveis de validade
                </div>
              </article>

              {/* Pillar 2 */}
              <article className="flex flex-col justify-between rounded-3xl border border-outline-variant/60 bg-[#FBFBF7] p-6 transition hover:-translate-y-1 hover:shadow-lg">
                <div>
                  <div className="mb-6 h-48 overflow-hidden rounded-2xl border border-outline-variant/40">
                    <img
                      src="/chef-hands-seasoning.jpg"
                      alt="Mãos temperando comida fresca com cuidado"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    2
                  </div>
                  <h3
                    className="mb-2 text-xl font-bold text-primary"
                    style={{ fontFamily: 'Fraunces, serif' }}
                  >
                    Receitas com Inteligência Humana
                  </h3>
                  <p className="text-sm leading-relaxed text-on-surface-variant">
                    Receba sugestões culinárias brasileiras com base no que você
                    realmente tem. Aproveite talos, cascas, sobras e descubra
                    combinações deliciosas.
                  </p>
                </div>
                <div className="mt-6 flex items-center border-t border-outline-variant/40 pt-4 text-xs font-semibold text-primary">
                  <span className="material-symbols-outlined mr-1 text-base">
                    auto_awesome
                  </span>
                  Sugestões em português sob medida
                </div>
              </article>

              {/* Pillar 3 */}
              <article className="flex flex-col justify-between rounded-3xl border border-outline-variant/60 bg-[#FBFBF7] p-6 transition hover:-translate-y-1 hover:shadow-lg">
                <div>
                  <div className="mb-6 h-48 overflow-hidden rounded-2xl border border-outline-variant/40">
                    <img
                      src="/salad-wooden-table.jpg"
                      alt="Prato saudável em mesa rústica de madeira"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    3
                  </div>
                  <h3
                    className="mb-2 text-xl font-bold text-primary"
                    style={{ fontFamily: 'Fraunces, serif' }}
                  >
                    Dashboards de Impacto Real
                  </h3>
                  <p className="text-sm leading-relaxed text-on-surface-variant">
                    Acompanhe em gráficos intuitivos quanta comida foi salva, a
                    pegada hídrica poupada, emissões de CO₂ evitadas e o dinheiro
                    que permaneceu no seu bolso.
                  </p>
                </div>
                <div className="mt-6 flex items-center border-t border-outline-variant/40 pt-4 text-xs font-semibold text-primary">
                  <span className="material-symbols-outlined mr-1 text-base">
                    insights
                  </span>
                  Metodologia científica FAO & IPCC
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* Zero-Waste Culinary Showcase (Inspired by User photo 7) */}
        <section id="receitas" className="bg-[#F2F4F2] py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-12">
              <div className="overflow-hidden rounded-3xl border-4 border-white shadow-xl lg:col-span-6">
                <img
                  src="/zero-waste-cooking.jpg"
                  alt="Cozinha zero desperdício: bolinhos de arroz, wraps de talos e reciclagem de óleo"
                  className="h-[440px] w-full object-cover"
                />
              </div>

              <div className="space-y-6 lg:col-span-6">
                <span className="rounded-full bg-secondary-container px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-primary">
                  Exemplo Real de Cozinha Viva
                </span>
                <h2
                  className="text-3xl font-bold text-primary sm:text-4xl"
                  style={{ fontFamily: 'Fraunces, serif' }}
                >
                  Da sobra esquecida ao prato favorito da família.
                </h2>
                <p className="leading-relaxed text-on-surface-variant">
                  O que antes iria para a lixeira se transforma em refeições
                  nutritivas. Nossa IA compreende o valor de cada parte do alimento:
                </p>

                <div className="space-y-3.5 pt-2">
                  <div className="flex items-start gap-3 rounded-2xl border border-outline-variant/40 bg-white p-4">
                    <span className="material-symbols-outlined mt-0.5 text-2xl text-emerald-600">
                      check_circle
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-primary">
                        Bolinhos dourados com sobras de arroz
                      </h4>
                      <p className="mt-0.5 text-xs text-on-surface-variant">
                        Misturados com ervas frescas e queijo, dourados na
                        frigideira em minutos.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-outline-variant/40 bg-white p-4">
                    <span className="material-symbols-outlined mt-0.5 text-2xl text-emerald-600">
                      check_circle
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-primary">
                        Wraps verdes nutritivos de talos de espinafre
                      </h4>
                      <p className="mt-0.5 text-xs text-on-surface-variant">
                        Bata os talos com farinha e água para criar panquecas ricas
                        em fibras e ferro.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-outline-variant/40 bg-white p-4">
                    <span className="material-symbols-outlined mt-0.5 text-2xl text-emerald-600">
                      recycling
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-primary">
                        Gestão consciente de óleo e resíduos
                      </h4>
                      <p className="mt-0.5 text-xs text-on-surface-variant">
                        Armazenamento e orientações para reciclagem correta de óleo
                        vegetal usado.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    className="inline-flex items-center gap-2 text-sm font-bold text-primary underline underline-offset-4 hover:text-primary-container"
                    onClick={onSignUp}
                    type="button"
                  >
                    <span>Experimentar gerador de receitas agora</span>
                    <span className="material-symbols-outlined text-base">
                      arrow_forward
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Human Manifesto */}
        <section id="manifesto" className="border-t border-[#E8EAE6] bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-4xl space-y-6 px-4 text-center sm:px-6">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary-container text-primary">
              <span className="material-symbols-outlined text-2xl">favorite</span>
            </div>
            <h2
              className="text-3xl font-bold leading-tight text-primary sm:text-4xl"
              style={{ fontFamily: 'Fraunces, serif' }}
            >
              &quot;Cozinhar não é sobre regras perfeitas. <br />
              É sobre afeto, presença e respeito pelo que a terra nos entrega.&quot;
            </h2>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-on-surface-variant sm:text-lg">
              Criamos o Smart Pantry porque acreditamos que a sustentabilidade
              começa no prato de cada família. Quando cuidamos da nossa despensa,
              cuidamos do orçamento da nossa casa e da saúde do planeta.
            </p>
            <div className="pt-2">
              <p className="text-sm font-bold text-primary">— Equipe Smart Pantry</p>
              <p className="text-xs text-on-surface-variant">
                Tecnologia com alma e responsabilidade socioambiental
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="bg-[#FBFBF7] py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl bg-[#154212] p-8 text-center text-white shadow-xl sm:p-14">
              <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#244528] blur-2xl" />
              <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-[#244528] blur-2xl" />

              <span className="relative inline-flex items-center gap-1.5 rounded-full border border-[#2D5A27] bg-[#244528] px-3.5 py-1 text-xs font-semibold text-secondary-container">
                <span className="material-symbols-outlined text-sm">spark</span>
                Comece em menos de 1 minuto
              </span>

              <h2
                className="relative mx-auto mt-4 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl"
                style={{ fontFamily: 'Fraunces, serif' }}
              >
                Pronto para transformar a relação da sua casa com a comida?
              </h2>

              <p className="relative mx-auto mt-3 max-w-xl text-base text-secondary-container/90">
                Cadastre-se gratuitamente com sua conta Google e comece hoje mesmo a
                salvar alimentos, economizar e fazer a diferença.
              </p>

              <div className="relative mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <button
                  className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-8 py-4 text-base font-bold text-primary shadow-lg transition hover:bg-secondary-container sm:w-auto"
                  onClick={onSignUp}
                  type="button"
                >
                  <GoogleIcon />
                  <span>Criar Conta com Google</span>
                </button>
              </div>

              <p className="relative mt-4 text-xs text-secondary-container/70">
                Sem necessidade de cartão de crédito. Seus dados 100% protegidos.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E8EAE6] bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 border-b border-[#E8EAE6] pb-8 md:flex-row">
            <BrandHeaderLogo />
            <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-on-surface-variant">
              <a href="#como-funciona" className="transition hover:text-primary">
                Como Funciona
              </a>
              <a href="#receitas" className="transition hover:text-primary">
                Receitas Zero-Waste
              </a>
              <a href="#impacto" className="transition hover:text-primary">
                Impacto Sustentável
              </a>
              <a href="#manifesto" className="transition hover:text-primary">
                Manifesto
              </a>
            </nav>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 pt-8 text-center text-xs text-on-surface-variant sm:flex-row sm:text-left">
            <p>
              © 2026 Smart Pantry. Projeto acadêmico comprometido com o ODS 12 da
              ONU (Consumo e Produção Responsáveis).
            </p>
            <p className="flex items-center gap-1">
              Feito com carinho por humanos para um futuro sustentável.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage