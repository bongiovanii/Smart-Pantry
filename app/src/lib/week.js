const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo'
const DAY_IN_MS = 24 * 60 * 60 * 1000

const dateOnlyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SAO_PAULO_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  timeZone: 'UTC',
})

function parseDateOnly(value) {
  return new Date(`${value}T12:00:00Z`)
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10)
}

/**
 * Converte uma data para o formato `YYYY-MM-DD` no fuso de Brasília.
 *
 * O banco usa `date` e o planejamento vira a semana na segunda-feira local;
 * por isso não podemos usar `toISOString()` diretamente, que refletiria o
 * fuso do navegador (ou UTC).
 */
export function toDateOnly(date = new Date()) {
  return dateOnlyFormatter.format(date)
}

/**
 * Retorna a segunda-feira da semana de `date`, como `YYYY-MM-DD`.
 * Domingo pertence à semana que começou na segunda anterior.
 */
export function getMonday(date = new Date()) {
  const monday = parseDateOnly(toDateOnly(date))
  const dayOfWeek = monday.getUTCDay()
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  monday.setUTCDate(monday.getUTCDate() - offset)

  return formatDateOnly(monday)
}

/**
 * Soma ou subtrai semanas de uma data `YYYY-MM-DD`.
 */
export function addWeeks(dateOnly, amount = 0) {
  const date = parseDateOnly(dateOnly)
  date.setUTCDate(date.getUTCDate() + Number(amount || 0) * 7)

  return formatDateOnly(date)
}

/**
 * Calcula o índice (1 a 4) da semana dentro do ciclo iniciado em `startedOn`.
 * O módulo positivo mantém o resultado entre 1 e 4 mesmo para datas
 * anteriores ao início do ciclo.
 */
export function getCycleWeekIndex(startedOn, monday) {
  const start = parseDateOnly(startedOn)
  const current = parseDateOnly(monday)
  const diffInDays = Math.round((current.getTime() - start.getTime()) / DAY_IN_MS)
  const weekOffset = Math.floor(diffInDays / 7)

  return ((weekOffset % 4) + 4) % 4 + 1
}

/**
 * Formata o intervalo da semana para exibição, por exemplo
 * "9 a 15 de novembro de 2026" ou "30 de novembro a 6 de dezembro de 2026".
 */
export function formatWeekRange(monday) {
  if (!monday) return ''

  const start = parseDateOnly(monday)
  const end = new Date(start.getTime() + 6 * DAY_IN_MS)
  const startDay = start.getUTCDate()
  const endDay = end.getUTCDate()
  const startMonth = monthFormatter.format(start)
  const endMonth = monthFormatter.format(end)
  const startYear = start.getUTCFullYear()
  const endYear = end.getUTCFullYear()

  if (startMonth === endMonth && startYear === endYear) {
    return `${startDay} a ${endDay} de ${startMonth} de ${startYear}`
  }

  if (startYear === endYear) {
    return `${startDay} de ${startMonth} a ${endDay} de ${endMonth} de ${startYear}`
  }

  return `${startDay} de ${startMonth} de ${startYear} a ${endDay} de ${endMonth} de ${endYear}`
}

/**
 * Formata apenas o dia e o mês de uma data `YYYY-MM-DD` (fuso UTC para não
 * deslocar a data). Usado nos cabeçalhos dos dias da grade.
 */
export function formatShortDate(dateOnly) {
  if (!dateOnly) return ''

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(parseDateOnly(dateOnly))
}

/**
 * Retorna a data de um dia da semana a partir da segunda-feira.
 * `dayIndex` vai de 0 (segunda) a 6 (domingo).
 */
export function getDateForDay(monday, dayIndex) {
  const date = parseDateOnly(monday)
  date.setUTCDate(date.getUTCDate() + Number(dayIndex || 0))

  return formatDateOnly(date)
}
