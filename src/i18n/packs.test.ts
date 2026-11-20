import { describe, expect, it } from 'vitest'
import { en } from './en'
import { fr } from './fr'
import ar from './packs/ar'
import bn from './packs/bn'
import de from './packs/de'
import es from './packs/es'
import hi from './packs/hi'
import pt from './packs/pt'
import ru from './packs/ru'
import ur from './packs/ur'
import zh from './packs/zh'

function leaves(node: unknown, trail: string[] = [], out: string[] = []): string[] {
  if (typeof node === 'string') out.push(trail.join('.'))
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) leaves(v, [...trail, k], out)
  return out
}

const base = leaves(en).filter((key) => !/_(one|other|few|many|zero|two)$/.test(key))
const packs = { fr, ar, bn, de, es, hi, pt, ru, ur, zh }

describe('translations', () => {
  for (const [code, pack] of Object.entries(packs)) {
    it(`${code} has every English text`, () => {
      const have = new Set(leaves(pack))
      const missing = base.filter((key) => !have.has(key))
      expect(missing).toEqual([])
    })
  }
})
