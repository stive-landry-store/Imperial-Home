import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const src = fs.readFileSync(path.join(root, 'src/i18n/en.ts'), 'utf8')
const body = src.replace(/^export const en = /, '').replace(/\nexport type Messages[\s\S]*$/, '')
const en = Function(`"use strict"; return (${body});`)()

const allTargets = {
  zh: 'zh-CN',
  hi: 'hi',
  es: 'es',
  ar: 'ar',
  bn: 'bn',
  pt: 'pt',
  ru: 'ru',
  ur: 'ur',
  de: 'de',
}
const only = process.argv[2]
const targets = only ? { [only]: allTargets[only] } : allTargets
if (only && !allTargets[only]) {
  console.error('Unknown language ' + only)
  process.exit(1)
}

function walk(node, trail, out) {
  if (typeof node === 'string') out.push({ trail, text: node })
  else if (Array.isArray(node)) node.forEach((item, index) => walk(item, trail.concat(index), out))
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) walk(value, trail.concat(key), out)
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function setAt(root, trail, value) {
  let cursor = root
  for (let i = 0; i < trail.length - 1; i += 1) cursor = cursor[trail[i]]
  cursor[trail[trail.length - 1]] = value
}

function shield(text) {
  const tokens = []
  let next = text
    .split("L'art du soin. L'esprit du détail.").join('XHMOTTO')
    .split('The art of care. The spirit of detail.').join('XHMOTTO')
    .split('Imperial Home').join('XHNAME')
    .split('Imperial Home').join('XHNAME')
  next = next.replace(/\{\{[^}]+\}\}/g, (match) => {
    const id = `XHP${tokens.length}X`
    tokens.push(match)
    return id
  })
  return { text: next, tokens }
}

function restore(text, tokens) {
  let next = text
  tokens.forEach((token, index) => {
    next = next.split(`XHP${index}X`).join(token)
  })
  return next.split('XHMOTTO').join("L'art du soin. L'esprit du détail.").split('XHNAME').join('Imperial Home')
}

async function translateOne(text, target) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${target}&dt=t&q=${encodeURIComponent(text)}`
  let last = 'translate failed'
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        return data[0].map((part) => part[0]).join('')
      }
      last = `translate ${response.status}`
    } catch (error) {
      last = error instanceof Error ? error.message : 'translate failed'
    }
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)))
  }
  throw new Error(last)
}

async function translateBatch(texts, target) {
  const shielded = texts.map(shield)
  const payload = shielded.map((item) => item.text).join('\n@@\n')
  const joined = await translateOne(payload, target)
  const parts = joined.split(/\n?\s*@@\s*\n?/)
  if (parts.length !== texts.length) {
    const singles = []
    for (const item of shielded) singles.push(await translateOne(item.text, target))
    return singles.map((value, index) => restore(value, shielded[index].tokens))
  }
  return parts.map((value, index) => restore(value.trim(), shielded[index].tokens))
}

const leaves = []
walk(en, [], leaves)
const outDir = path.join(root, 'src/i18n/packs')
fs.mkdirSync(outDir, { recursive: true })

function existingPack(code) {
  const file = path.join(outDir, `${code}.ts`)
  if (!fs.existsSync(file)) return null
  const text = fs.readFileSync(file, 'utf8')
  const body = text.replace(/^import[^\n]*\n/gm, '').replace(/^const pack = /m, '').replace(/\nexport default[\s\S]*$/, '').replace(/\} as Messages\s*$/, '}')
  return Function(`"use strict"; return (${body});`)()
}

function getAt(root, trail) {
  return trail.reduce((node, key) => (node == null ? undefined : node[key]), root)
}

// Only texts missing from a pack are translated; existing, reviewed translations are kept.
for (const [code, target] of Object.entries(targets)) {
  const current = existingPack(code)
  const tree = clone(en)
  const todo = []
  for (const item of leaves) {
    const kept = current ? getAt(current, item.trail) : undefined
    if (typeof kept === 'string') setAt(tree, item.trail, kept)
    else todo.push(item)
  }
  for (let index = 0; index < todo.length; index += 4) {
    const slice = todo.slice(index, index + 4)
    const translated = await translateBatch(slice.map((item) => item.text), target)
    slice.forEach((item, offset) => setAt(tree, item.trail, translated[offset] || item.text))
    if (index % 40 === 0) console.log(code, index, '/', todo.length)
    await new Promise((resolve) => setTimeout(resolve, 350))
  }
  tree.brand = 'Imperial Home'
  tree.hero.tagline = "L'art du soin. L'esprit du détail."
  tree.chat.team = 'Imperial Home'
  const file = `import type { Messages } from '../en'\n\nconst pack = ${JSON.stringify(tree, null, 2)} as Messages\n\nexport default pack\n`
  fs.writeFileSync(path.join(outDir, `${code}.ts`), file)
  console.log('wrote', code, leaves.length)
}
