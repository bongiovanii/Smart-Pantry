import { describe, expect, it } from 'vitest'
import {
  addWeeks,
  formatShortDate,
  formatWeekRange,
  getCycleWeekIndex,
  getDateForDay,
  getMonday,
  toDateOnly,
} from '../week.js'

describe('toDateOnly', () => {
  it('usa o fuso de Brasília em vez de UTC', () => {
    // 01:30 UTC de 13/11 ainda é 12/11 em Brasília (UTC-3).
    expect(toDateOnly(new Date('2026-11-13T01:30:00Z'))).toBe('2026-11-12')
  })

  it('mantém a data quando o horário já está no fuso local', () => {
    expect(toDateOnly(new Date('2026-11-12T15:00:00Z'))).toBe('2026-11-12')
  })
})

describe('getMonday', () => {
  it('retorna a própria segunda-feira', () => {
    expect(getMonday(new Date('2026-11-09T15:00:00Z'))).toBe('2026-11-09')
  })

  it('retorna a segunda anterior para uma quinta-feira', () => {
    expect(getMonday(new Date('2026-11-12T15:00:00Z'))).toBe('2026-11-09')
  })

  it('domingo pertence à semana que começou na segunda anterior', () => {
    expect(getMonday(new Date('2026-11-15T15:00:00Z'))).toBe('2026-11-09')
  })

  it('considera a virada do dia no fuso de Brasília', () => {
    // 04:00 UTC de 16/11 é 01:00 da segunda-feira em Brasília.
    expect(getMonday(new Date('2026-11-16T04:00:00Z'))).toBe('2026-11-16')
  })
})

describe('addWeeks', () => {
  it('soma semanas dentro do mesmo mês', () => {
    expect(addWeeks('2026-11-09', 1)).toBe('2026-11-16')
  })

  it('atravessa a virada do mês', () => {
    expect(addWeeks('2026-11-30', 1)).toBe('2026-12-07')
  })

  it('subtrai semanas', () => {
    expect(addWeeks('2026-01-05', -1)).toBe('2025-12-29')
  })
})

describe('getCycleWeekIndex', () => {
  const startedOn = '2026-11-09'

  it('retorna 1 na semana inicial', () => {
    expect(getCycleWeekIndex(startedOn, '2026-11-09')).toBe(1)
  })

  it('avança até 4 e reinicia o ciclo', () => {
    expect(getCycleWeekIndex(startedOn, '2026-11-16')).toBe(2)
    expect(getCycleWeekIndex(startedOn, '2026-11-23')).toBe(3)
    expect(getCycleWeekIndex(startedOn, '2026-11-30')).toBe(4)
    expect(getCycleWeekIndex(startedOn, '2026-12-07')).toBe(1)
  })

  it('mantém o índice entre 1 e 4 para datas anteriores ao ciclo', () => {
    expect(getCycleWeekIndex(startedOn, '2026-11-02')).toBe(4)
  })
})

describe('formatWeekRange', () => {
  it('formata um intervalo dentro do mesmo mês', () => {
    expect(formatWeekRange('2026-11-09')).toBe(
      '9 a 15 de novembro de 2026',
    )
  })

  it('formata um intervalo que cruza meses', () => {
    expect(formatWeekRange('2026-11-30')).toBe(
      '30 de novembro a 6 de dezembro de 2026',
    )
  })
})

describe('getDateForDay e formatShortDate', () => {
  it('retorna cada dia a partir da segunda-feira', () => {
    expect(getDateForDay('2026-11-09', 0)).toBe('2026-11-09')
    expect(getDateForDay('2026-11-09', 6)).toBe('2026-11-15')
  })

  it('formata dia e mês sem deslocar a data', () => {
    expect(formatShortDate('2026-11-09')).toBe('09/11')
  })
})
