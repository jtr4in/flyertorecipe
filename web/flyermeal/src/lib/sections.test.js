import { describe, expect, it } from 'vitest'
import { bySection, sectionFor } from './sections'

describe('sectionFor', () => {
  it('files everyday items where they are in the store', () => {
    expect(sectionFor('chicken thighs')).toBe('meat')
    expect(sectionFor('bananas')).toBe('produce')
    expect(sectionFor('eggs')).toBe('dairy')
    expect(sectionFor('toilet paper')).toBe('household')
    expect(sectionFor('frozen peas')).toBe('frozen')
  })
  it('goes by the last thing named, and phrases first', () => {
    expect(sectionFor('chicken broth')).toBe('pantry')
    expect(sectionFor('hot dog buns')).toBe('bakery')
    expect(sectionFor('peanut butter')).toBe('pantry')
    expect(sectionFor('black pepper')).toBe('baking')
    expect(sectionFor('red bell pepper')).toBe('produce')
    expect(sectionFor('garlic cloves')).toBe('produce')
    expect(sectionFor('eggplant')).toBe('produce')
  })
  it("falls back to the flyer's aisle, then Other", () => {
    expect(sectionFor('zzz thing', 'Snacks')).toBe('snacks')
    expect(sectionFor('zzz thing')).toBe('other')
  })
})

describe('bySection', () => {
  it('orders sections like a store walk, keeps moves, and sinks checked items', () => {
    const out = bySection([
      { name: 'milk' }, { name: 'apples', checked: true }, { name: 'carrots' }, { name: 'rice', section: 'frozen' },
    ])
    expect(out.map((s) => s.id)).toEqual(['produce', 'dairy', 'frozen'])
    expect(out[0].lines.map((l) => l.name)).toEqual(['carrots', 'apples'])
  })
})
