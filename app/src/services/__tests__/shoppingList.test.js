import { describe, expect, it, vi } from 'vitest'
import { recordPantryEntry } from '../pantry.js'
import {
  addShoppingItem,
  extractMealPlanMissingItems,
  getShoppingSuggestions,
  listShoppingItems,
  markShoppingItemPurchased,
  removeShoppingItem,
  updateShoppingItem,
} from '../shoppingList.js'

const mockRpc = vi.fn()
const mockFrom = vi.fn()

vi.mock('../../lib/session.js', () => ({
  getCurrentSession: vi.fn().mockResolvedValue({
    user: { id: 'test-user-id' },
  }),
}))

vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    rpc: (...args) => mockRpc(...args),
    from: (...args) => mockFrom(...args),
  },
}))

describe('shoppingList service', () => {
  it('listShoppingItems consulta a tabela com o filtro de status correto', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'item-1',
            user_id: 'test-user-id',
            name: 'Leite',
            name_normalized: 'leite',
            category: 'laticinios',
            unit: 'l',
            quantity: 2,
            source: 'manual',
            status: 'pending',
            created_at: '2026-11-12T10:00:00Z',
          },
        ],
        error: null,
      }),
    }
    mockFrom.mockReturnValueOnce(chain)

    const result = await listShoppingItems({ status: 'pending' })

    expect(mockFrom).toHaveBeenCalledWith('shopping_list_items')
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'test-user-id')
    expect(chain.eq).toHaveBeenCalledWith('status', 'pending')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Leite')
    expect(result[0].isPending).toBe(true)
  })

  it('addShoppingItem valida obrigatoriedade do nome e quantidade maior que zero', async () => {
    await expect(
      addShoppingItem({ name: '   ', quantity: 1 }),
    ).rejects.toThrow('Informe o nome do item.')

    await expect(
      addShoppingItem({ name: 'Arroz', quantity: 0 }),
    ).rejects.toThrow('A quantidade deve ser maior que zero.')

    await expect(
      addShoppingItem({ name: 'Arroz', quantity: -2 }),
    ).rejects.toThrow('A quantidade deve ser maior que zero.')
  })

  it('addShoppingItem incrementa quantidade se item já existir como pendente', async () => {
    // 1. Busca existente
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'existing-id', quantity: 2 },
        error: null,
      }),
    }
    // 2. Update chamado por addShoppingItem
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'existing-id',
          user_id: 'test-user-id',
          name: 'Arroz',
          name_normalized: 'arroz',
          unit: 'kg',
          quantity: 3,
          status: 'pending',
        },
        error: null,
      }),
    }

    mockFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain)

    const result = await addShoppingItem({
      name: 'Arroz',
      unit: 'kg',
      quantity: 1,
    })

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 3 }),
    )
    expect(result.quantity).toBe(3)
  })

  it('addShoppingItem insere novo item se não existir na lista pendente', async () => {
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }

    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'new-item-id',
          user_id: 'test-user-id',
          name: 'Feijão preto',
          name_normalized: 'feijao preto',
          category: 'graos',
          unit: 'kg',
          quantity: 1.5,
          status: 'pending',
        },
        error: null,
      }),
    }

    mockFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(insertChain)

    const result = await addShoppingItem({
      name: 'Feijão preto',
      category: 'graos',
      unit: 'kg',
      quantity: 1.5,
    })

    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Feijão preto',
        name_normalized: 'feijao preto',
        quantity: 1.5,
      }),
    )
    expect(result.id).toBe('new-item-id')
  })

  it('updateShoppingItem valida campos e atualiza item', async () => {
    await expect(updateShoppingItem('', {})).rejects.toThrow('Item não informado.')
    await expect(
      updateShoppingItem('item-1', { quantity: -1 }),
    ).rejects.toThrow('A quantidade deve ser maior que zero.')

    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'item-1',
          name: 'Cenoura fresca',
          quantity: 3,
        },
        error: null,
      }),
    }
    mockFrom.mockReturnValueOnce(chain)

    const updated = await updateShoppingItem('item-1', {
      name: 'Cenoura fresca',
      quantity: 3,
    })

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Cenoura fresca',
        quantity: 3,
      }),
    )
    expect(updated.name).toBe('Cenoura fresca')
  })

  it('removeShoppingItem atualiza status para removed', async () => {
    await expect(removeShoppingItem('')).rejects.toThrow('Item não informado.')

    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    mockFrom.mockReturnValueOnce(chain)

    const success = await removeShoppingItem('item-123')
    expect(chain.update).toHaveBeenCalledWith({ status: 'removed' })
    expect(success).toBe(true)
  })

  it('markShoppingItemPurchased aciona RPC mark_shopping_item_purchased', async () => {
    await expect(markShoppingItemPurchased('')).rejects.toThrow(
      'Item não informado.',
    )

    mockRpc.mockResolvedValueOnce({
      data: {
        id: 'item-1',
        user_id: 'test-user-id',
        name: 'Azeite',
        status: 'purchased',
        quantity: 1,
        unit: 'un',
      },
      error: null,
    })

    const result = await markShoppingItemPurchased('item-1', {
      quantity: 2,
      addToPantry: true,
      expirationDate: '2026-12-31',
    })

    expect(mockRpc).toHaveBeenCalledWith('mark_shopping_item_purchased', {
      p_item_id: 'item-1',
      p_quantity: 2,
      p_add_to_pantry: true,
      p_category: null,
      p_expiration_date: '2026-12-31',
    })
    expect(result.status).toBe('purchased')
  })

  it('getShoppingSuggestions aciona RPC get_shopping_suggestions com período padrão', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          name: 'Cebola',
          nameNormalized: 'cebola',
          unit: 'kg',
          suggestedQuantity: 1,
          reason: 'Estoque acabando',
          score: 0.9,
        },
      ],
      error: null,
    })

    const suggestions = await getShoppingSuggestions(90)
    expect(mockRpc).toHaveBeenCalledWith('get_shopping_suggestions', {
      p_days: 90,
    })
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].name).toBe('Cebola')
  })

  it('extractMealPlanMissingItems agrega ingredientes faltantes excluindo os já pendentes na lista', () => {
    const weeklyPlan = [
      {
        recipe: {
          title: 'Omelete',
          missedIngredients: [
            { name: 'Ovos', amount: 3, unit: 'un' },
            { name: 'Queijo', amount: 100, unit: 'g' },
          ],
        },
      },
      {
        recipe: {
          title: 'Bolo',
          missedIngredients: [
            { name: 'Ovos', amount: 2, unit: 'un' },
            { name: 'Farinha', amount: 200, unit: 'g' },
          ],
        },
      },
    ]

    const pendingShoppingItems = [
      { name: 'Farinha', nameNormalized: 'farinha', unit: 'g' },
    ]

    const pantryItems = []

    const missing = extractMealPlanMissingItems(
      weeklyPlan,
      pantryItems,
      pendingShoppingItems,
    )

    // Ovos deve ter somado 3 + 2 = 5
    const eggs = missing.find((m) => m.nameNormalized === 'ovo')
    expect(eggs).toBeDefined()
    expect(eggs.quantity).toBe(5)
    expect(eggs.recipeTitles).toEqual(['Omelete', 'Bolo'])

    // Queijo deve estar presente
    const cheese = missing.find((m) => m.nameNormalized === 'queijo')
    expect(cheese).toBeDefined()
    expect(cheese.quantity).toBe(100)

    // Farinha já está pendente na lista de compras, portanto não deve constar
    const flour = missing.find((m) => m.nameNormalized === 'farinha')
    expect(flour).toBeUndefined()
  })
})

describe('recordPantryEntry in pantry service', () => {
  it('valida parâmetros e aciona RPC record_pantry_entry', async () => {
    await expect(recordPantryEntry('', { quantity: 1 })).rejects.toThrow(
      'Alimento não informado.',
    )

    await expect(recordPantryEntry('item-1', { quantity: 0 })).rejects.toThrow(
      'A quantidade de reposição deve ser maior que zero.',
    )

    mockRpc.mockResolvedValueOnce({
      data: {
        id: 'item-1',
        name: 'Arroz',
        quantity: 5,
        unit: 'kg',
      },
      error: null,
    })

    const result = await recordPantryEntry('item-1', {
      quantity: 2,
      reason: 'Compra do mês',
    })

    expect(mockRpc).toHaveBeenCalledWith('record_pantry_entry', {
      p_item_id: 'item-1',
      p_quantity: 2,
      p_reason: 'Compra do mês',
    })
    expect(result.quantity).toBe(5)
  })
})
