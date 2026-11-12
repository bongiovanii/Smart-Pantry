import { describe, expect, it } from 'vitest'
import {
  mergeRecipeLists,
  normalizeRecipeFromApi,
  normalizeRecipeFromRow,
} from '../recipeRecord.js'

describe('normalizeRecipeFromRow', () => {
  it('converte a linha da biblioteca para o contrato dos cards', () => {
    const recipe = normalizeRecipeFromRow({
      id: 'uuid-1',
      title: 'Arroz carreteiro',
      category: 'arroz',
      image: 'https://exemplo.com/arroz.jpg',
      ready_in_minutes: 35,
      servings: 4,
      calories_per_serving: 420,
      used_ingredients: [{ name: 'Arroz', amount: '2 xícaras' }],
      missed_ingredients: [{ name: 'Carne', amount: '300g' }],
      steps: ['Refogue tudo.'],
      image_query: 'arroz carreteiro',
      is_favorite: true,
    })

    expect(recipe).toMatchObject({
      id: 'uuid-1',
      title: 'Arroz carreteiro',
      time: '35 min',
      usedIngredientCount: 1,
      missedIngredientCount: 1,
      caloriesPerServing: 420,
      isFavorite: true,
      origin: 'library',
    })
  })
})

describe('normalizeRecipeFromApi', () => {
  it('calcula contagens a partir dos ingredientes retornados', () => {
    const recipe = normalizeRecipeFromApi({
      id: 'uuid-2',
      title: 'Salada',
      readyInMinutes: 10,
      caloriesPerServing: 180,
      usedIngredients: [{ name: 'Alface' }, { name: 'Tomate' }],
      missedIngredients: [],
      steps: [],
      origin: 'ai',
    })

    expect(recipe).toMatchObject({
      title: 'Salada',
      time: '10 min',
      usedIngredientCount: 2,
      missedIngredientCount: 0,
      caloriesPerServing: 180,
      origin: 'ai',
    })
  })
})

describe('mergeRecipeLists', () => {
  it('não repete receitas com títulos equivalentes', () => {
    const merged = mergeRecipeLists(
      [
        { id: '1', title: 'Macarrão à Bolonhesa' },
        { id: '2', title: 'Salada' },
      ],
      [
        { id: '3', title: 'macarrao a bolonhesa' },
        { id: '4', title: 'Sopa' },
      ],
    )

    expect(merged.map((recipe) => recipe.id)).toEqual(['1', '2', '4'])
  })
})
