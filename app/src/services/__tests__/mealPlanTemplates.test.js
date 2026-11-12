import { describe, expect, it, vi } from 'vitest'
import {
  createTemplate,
  duplicateTemplate,
  updateTemplate,
  upsertTemplateItem,
} from '../mealPlanTemplates.js'

vi.mock('../../lib/session.js', () => ({
  getCurrentSession: vi.fn().mockResolvedValue({
    user: { id: 'test-user-id' },
  }),
}))

vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'template-1', name: 'Semana Leve', week_index: 1 },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'template-1', name: 'Semana Atualizada', week_index: 1 },
              error: null,
            }),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
    rpc: vi.fn(),
  },
}))

describe('mealPlanTemplates - validações', () => {
  it('rejeita criação de template sem nome', async () => {
    await expect(
      createTemplate({ name: '   ', weekIndex: 1 }),
    ).rejects.toThrow('Informe um nome para o template.')
  })

  it('rejeita criação com nome maior que 80 caracteres', async () => {
    await expect(
      createTemplate({ name: 'A'.repeat(81), weekIndex: 1 }),
    ).rejects.toThrow('O nome do template deve ter até 80 caracteres.')
  })

  it('rejeita criação com weekIndex inválido', async () => {
    await expect(
      createTemplate({ name: 'Template 5', weekIndex: 5 }),
    ).rejects.toThrow('Selecione uma semana do ciclo entre 1 e 4.')

    await expect(
      createTemplate({ name: 'Template 0', weekIndex: 0 }),
    ).rejects.toThrow('Selecione uma semana do ciclo entre 1 e 4.')
  })

  it('rejeita atualização sem ID ou sem nome', async () => {
    await expect(updateTemplate('', { name: 'Novo' })).rejects.toThrow(
      'Template não informado.',
    )

    await expect(updateTemplate('t-1', { name: '' })).rejects.toThrow(
      'Informe um nome para o template.',
    )
  })

  it('rejeita duplicação sem ID', async () => {
    await expect(duplicateTemplate('')).rejects.toThrow(
      'Template não informado.',
    )
  })

  it('rejeita item de template com dia da semana inválido', async () => {
    await expect(
      upsertTemplateItem('template-1', {
        dayOfWeek: 'SEGUNDA',
        mealType: 'Almoço',
        recipe: { id: 'r1', title: 'Arroz' },
      }),
    ).rejects.toThrow('Selecione um dia da semana válido.')
  })

  it('rejeita item de template com tipo de refeição inválido', async () => {
    await expect(
      upsertTemplateItem('template-1', {
        dayOfWeek: 'SEG',
        mealType: 'Sobremesa',
        recipe: { id: 'r1', title: 'Arroz' },
      }),
    ).rejects.toThrow('Selecione um tipo de refeição válido.')
  })

  it('rejeita item de template sem receita', async () => {
    await expect(
      upsertTemplateItem('template-1', {
        dayOfWeek: 'SEG',
        mealType: 'Almoço',
        recipe: null,
      }),
    ).rejects.toThrow('Não foi possível identificar a receita selecionada.')
  })
})
