import { expect, it } from 'vitest'
import { withoutTonos } from './greekCaps'

it('removes the accents Greek capitals do not take, keeping diaeresis', () => {
  expect(withoutTonos('Κλείσε Τρί 13 · Αποδοχή')).toBe('Κλεισε Τρι 13 · Αποδοχη')
  expect(withoutTonos('Άνοιξε ΐδιο ΰλη')).toBe('Ανοιξε ϊδιο ϋλη')
  expect(withoutTonos('FADE 12,00 €')).toBe('FADE 12,00 €')
})
