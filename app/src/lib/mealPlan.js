// Dias e refeições aceitos pelo banco (public.meal_plans).
// A ordem é a mesma usada na grade semanal da interface.
export const WEEK_DAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM']

// Rótulos curtos exibidos nos cabeçalhos das colunas.
export const DAY_LABELS = {
  SEG: 'SEG',
  TER: 'TER',
  QUA: 'QUA',
  QUI: 'QUI',
  SEX: 'SEX',
  SAB: 'SÁB',
  DOM: 'DOM',
}

export const MEAL_TYPES = ['Café da manhã', 'Almoço', 'Lanche', 'Jantar']

export function getDayLabel(dayOfWeek) {
  return DAY_LABELS[dayOfWeek] ?? dayOfWeek
}
