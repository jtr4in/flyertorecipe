import { describe, expect, it } from 'vitest'
import { categorize, watchMatches, withExtras } from './extras'

const d = (name, extra = {}) => ({ dealId: name, name, merchant: 'Metro', price: 5, savings: 1, ...extra })

describe('other deals', () => {
  it('sorts deals into categories by flyer words', () => {
    expect(categorize(d('Cashmere Bathroom Tissue 12 Double Rolls'))).toBe('cleaning')
    expect(categorize(d('Dawn Dish Soap 1 L'))).toBe('cleaning')
    expect(categorize(d('Colgate Toothpaste 120 mL'))).toBe('personal')
    expect(categorize(d('Delissio Rising Crust Pizza'))).toBe('frozen')
    expect(categorize(d('GREEN GIANT FROZEN VEGETABLES'))).toBeNull()
    expect(categorize(d('PIZZA MOZZARELLA CHEESE, 2.3 KG'))).toBeNull()
    expect(categorize(d('Boneless Skinless Chicken Breast'))).toBeNull()
  })
  it('finds watched items', () => {
    const [w] = watchMatches([d('Cashmere Bathroom Tissue'), d('Royale Toilet Paper 24 rolls')], ['toilet paper'])
    expect(w.deals.map((x) => x.name)).toEqual(['Cashmere Bathroom Tissue', 'Royale Toilet Paper 24 rolls'])
  })
  it('adds extras to the list and its totals', () => {
    const list = { groups: [], flyers: [], totalCost: 10, totalSavings: 2, onSale: 1, itemCount: 1 }
    const out = withExtras(list, [{ deal: d('Tide Laundry Detergent'), category: 'cleaning' }])
    expect(out.groups.at(-1).title).toBe('Extras')
    expect(out.itemCount).toBe(2)
    expect(out.totalCost).toBe(15)
    expect(out.flyers).toHaveLength(1)
  })
})
