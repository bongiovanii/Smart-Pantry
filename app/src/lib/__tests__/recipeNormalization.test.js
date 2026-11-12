import { describe, expect, it } from 'vitest'
import {
  buildIngredientNames,
  normalizeIngredientName,
  normalizeRecipeTitle,
  normalizeText,
} from '../recipeNormalization.js'

describe('normalizeText', () => {
  it('remove acentos, pontuação e diferenças de caixa', () => {
    expect(normalizeText('  Macarrão à Bolonhesa!  ')).toBe(
      'macarrao a bolonhesa',
    )
  })

  it('mantém números e separa palavras', () => {
    expect(normalizeText('Arroz 2 xícaras')).toBe('arroz 2 xicaras')
  })
})

describe('normalizeIngredientName', () => {
  it.each([
    ['Tomates', 'tomate'],
    ['Ovos', 'ovo'],
    ['Cebolas', 'cebola'],
    ['Feijões', 'feijao'],
    ['Limões', 'limao'],
    ['Arroz', 'arroz'],
    ['Alho', 'alho'],
    ['Pães', 'pao'],
  ])('normaliza %s para %s', (input, expected) => {
    expect(normalizeIngredientName(input)).toBe(expected)
  })
})

describe('normalizeRecipeTitle', () => {
  it('trata títulos equivalentes como o mesmo título', () => {
    expect(normalizeRecipeTitle('Macarrão à Bolonhesa')).toBe(
      normalizeRecipeTitle('macarrao a bolonhesa'),
    )
  })
})

describe('buildIngredientNames', () => {
  it('usa apenas ingredientes da despensa, normaliza e remove duplicatas', () => {
    const names = buildIngredientNames({
      usedIngredients: [
        { name: 'Tomates' },
        { name: 'tomate' },
        { name: 'Cebolas' },
      ],
      missedIngredients: [{ name: 'Queijo' }],
    })

    expect(names).toEqual(['tomate', 'cebola'])
  })

  it('aceita strings e ignora valores vazios', () => {
    expect(
      buildIngredientNames({
        usedIngredients: ['Ovos', '', null, 'Leite'],
      }),
    ).toEqual(['ovo', 'leite'])
  })
})
