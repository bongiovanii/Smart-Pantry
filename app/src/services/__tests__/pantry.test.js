import { describe, expect, it, vi } from 'vitest'
import { toDateOnly } from '../../lib/week.js'
import { createPantryItem } from '../pantry.js'

vi.mock('../../lib/session.js', () => ({
  getCurrentSession: vi.fn().mockResolvedValue({
    user: { id: 'test-user-id' },
  }),
}))

vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'new-id', name: 'Arroz' },
            error: null,
          }),
        }),
      }),
    }),
  },
}))

describe('createPantryItem - validação de data de validade', () => {
  it('rejeita cadastro com data de validade anterior a hoje', async () => {
    const pastDate = '2020-01-01'

    await expect(
      createPantryItem({
        name: 'Arroz',
        category: 'graos',
        quantity: 1,
        unit: 'kg',
        expirationDate: pastDate,
      }),
    ).rejects.toThrow('A data de validade não pode ser anterior a hoje.')
  })

  it('permite cadastro com a data de hoje', async () => {
    const today = toDateOnly()

    const result = await createPantryItem({
      name: 'Arroz',
      category: 'graos',
      quantity: 1,
      unit: 'kg',
      expirationDate: today,
    })

    expect(result).toEqual({ id: 'new-id', name: 'Arroz' })
  })

  it('permite cadastro com data futura', async () => {
    const futureDate = '2099-12-31'

    const result = await createPantryItem({
      name: 'Arroz',
      category: 'graos',
      quantity: 1,
      unit: 'kg',
      expirationDate: futureDate,
    })

    expect(result).toEqual({ id: 'new-id', name: 'Arroz' })
  })

  it('permite cadastro sem data de validade', async () => {
    const result = await createPantryItem({
      name: 'Sal',
      category: 'outros',
      quantity: 1,
      unit: 'kg',
      expirationDate: '',
    })

    expect(result).toEqual({ id: 'new-id', name: 'Arroz' })
  })

  it('rejeita preço negativo', async () => {
    await expect(
      createPantryItem({
        name: 'Arroz',
        category: 'graos',
        quantity: 1,
        unit: 'kg',
        price: -10,
      }),
    ).rejects.toThrow('O preço informado não pode ser negativo.')
  })

  it('permite cadastro com preço válido', async () => {
    const result = await createPantryItem({
      name: 'Azeite',
      category: 'outros',
      quantity: 1,
      unit: 'un',
      price: '35,90',
    })

    expect(result).toEqual({ id: 'new-id', name: 'Arroz' })
  })
})
