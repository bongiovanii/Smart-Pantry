import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  findRecipeByTitle,
  listFavoriteRecipes,
  toggleFavoriteRecipe,
} from '../recipeLibrary.js'
import { getCurrentSession } from '../../lib/session.js'
import { supabase } from '../../lib/supabase.js'

vi.mock('../../lib/session.js', () => ({
  getCurrentSession: vi.fn(),
}))

vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe('recipeLibrary - Favoritas', () => {
  const userId = 'user-fav-123'

  beforeEach(() => {
    vi.clearAllMocks()
    getCurrentSession.mockResolvedValue({ user: { id: userId } })
  })

  describe('toggleFavoriteRecipe', () => {
    it('rejeita receita sem título válido', async () => {
      await expect(toggleFavoriteRecipe(null)).rejects.toThrow(
        'A receita precisa de um título válido.',
      )
      await expect(toggleFavoriteRecipe({ title: '   ' })).rejects.toThrow(
        'A receita precisa de um título válido.',
      )
    })

    it('inverte is_favorite para false se a receita já existia favoritada', async () => {
      const existingRow = {
        id: 'recipe-1',
        user_id: userId,
        title: 'Omelete de Forno',
        title_normalized: 'omelete de forno',
        category: 'refeicao',
        is_favorite: true,
        favorited_at: '2026-11-12T10:00:00Z',
      }

      const updatedRow = {
        ...existingRow,
        is_favorite: false,
        favorited_at: null,
      }

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: existingRow,
              error: null,
            }),
          }),
        }),
      })

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedRow,
                error: null,
              }),
            }),
          }),
        }),
      })

      supabase.from.mockReturnValue({
        select: selectMock,
        update: updateMock,
      })

      const result = await toggleFavoriteRecipe({ title: 'Omelete de Forno' })

      expect(supabase.from).toHaveBeenCalledWith('recipes')
      expect(result.isFavorite).toBe(false)
      expect(result.title).toBe('Omelete de Forno')
    })

    it('cria uma nova linha com is_favorite = true se a receita ainda não existir', async () => {
      const newRow = {
        id: 'recipe-new-2',
        user_id: userId,
        title: 'Panqueca de Banana',
        title_normalized: 'panqueca de banana',
        category: 'cafe',
        is_favorite: true,
        favorited_at: '2026-11-12T12:00:00Z',
      }

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: newRow,
            error: null,
          }),
        }),
      })

      supabase.from.mockReturnValue({
        select: selectMock,
        insert: insertMock,
      })

      const result = await toggleFavoriteRecipe({
        title: 'Panqueca de Banana',
        category: 'cafe',
        usedIngredients: [{ name: 'banana' }],
      })

      expect(insertMock).toHaveBeenCalled()
      expect(result.isFavorite).toBe(true)
      expect(result.title).toBe('Panqueca de Banana')
    })
  })

  describe('listFavoriteRecipes', () => {
    it('busca apenas receitas favoritas do usuário logado', async () => {
      const mockOrder2 = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'fav-1',
            title: 'Sopa de Legumes',
            is_favorite: true,
            favorited_at: '2026-11-12T12:00:00Z',
          },
        ],
        error: null,
      })

      const mockOrder1 = vi.fn().mockReturnValue({
        order: mockOrder2,
      })

      const eqFav = vi.fn().mockReturnValue({
        order: mockOrder1,
      })

      const eqUser = vi.fn().mockReturnValue({
        eq: eqFav,
      })

      const selectMock = vi.fn().mockReturnValue({
        eq: eqUser,
      })

      supabase.from.mockReturnValue({
        select: selectMock,
      })

      const favorites = await listFavoriteRecipes()

      expect(supabase.from).toHaveBeenCalledWith('recipes')
      expect(eqUser).toHaveBeenCalledWith('user_id', userId)
      expect(eqFav).toHaveBeenCalledWith('is_favorite', true)
      expect(favorites).toHaveLength(1)
      expect(favorites[0].title).toBe('Sopa de Legumes')
      expect(favorites[0].isFavorite).toBe(true)
    })
  })

  describe('findRecipeByTitle', () => {
    it('retorna null se o título for vazio ou nulo', async () => {
      const result = await findRecipeByTitle('')
      expect(result).toBeNull()
    })
  })
})
