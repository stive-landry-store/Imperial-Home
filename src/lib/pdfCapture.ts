import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

const MODERN_COLOR = /(?:oklab|oklch|lab|lch|color)\([^()]*\)/g

let probe: CanvasRenderingContext2D | null | undefined

function toRgba(value: string) {
  if (probe === undefined) {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    probe = canvas.getContext('2d', { willReadFrequently: true })
  }
  if (!probe) return value
  probe.clearRect(0, 0, 1, 1)
  probe.fillStyle = '#000000'
  probe.fillStyle = value
  probe.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data
  return `rgba(${r}, ${g}, ${b}, ${Math.round((a / 255) * 100) / 100})`
}

/** html2canvas cannot read oklab/oklch colors (Tailwind v4, opacity modifiers), so every computed color is rewritten as rgba. */
function flattenNode(source: Element, clone: Element) {
  if ((source instanceof HTMLElement || source instanceof SVGElement) && (clone instanceof HTMLElement || clone instanceof SVGElement)) {
    const style = getComputedStyle(source)
    for (let index = 0; index < style.length; index += 1) {
      const property = style[index]
      if (property.startsWith('--')) continue
      const value = style.getPropertyValue(property)
      if (!MODERN_COLOR.test(value)) continue
      MODERN_COLOR.lastIndex = 0
      clone.style.setProperty(property, value.replace(MODERN_COLOR, (match) => toRgba(match)))
    }
    MODERN_COLOR.lastIndex = 0
    clone.style.boxShadow = 'none'
  }
  if (source instanceof HTMLElement && clone instanceof HTMLElement) {
    const style = getComputedStyle(source)
    clone.style.fontSize = style.fontSize
    clone.style.lineHeight = style.lineHeight === 'normal' ? 'normal' : style.lineHeight
    clone.style.letterSpacing = style.letterSpacing
  }
  if (source instanceof SVGElement && clone instanceof SVGElement) {
    const style = getComputedStyle(source)
    if (style.fill && style.fill !== 'none') clone.setAttribute('fill', toRgba(style.fill))
    if (style.stroke && style.stroke !== 'none') clone.setAttribute('stroke', toRgba(style.stroke))
  }
  const originals = Array.from(source.children)
  const copies = Array.from(clone.children)
  originals.forEach((child, index) => {
    if (copies[index]) flattenNode(child, copies[index])
  })
}

/** html2canvas draws form fields and translated labels a few pixels off, so fields become plain text boxes and translated boxes get absolute offsets. */
function stabilizeLayout(source: HTMLElement, clone: HTMLElement) {
  const sourceFields = Array.from(source.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea'))
  const cloneFields = Array.from(clone.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea'))
  sourceFields.forEach((field, index) => {
    const copy = cloneFields[index]
    if (!copy || (field instanceof HTMLInputElement && ['checkbox', 'radio', 'hidden', 'button'].includes(field.type))) return
    const style = getComputedStyle(field)
    const box = field.getBoundingClientRect()
    const text = clone.ownerDocument.createElement('div')
    text.textContent = field.value
    const css = text.style
    css.display = 'block'
    css.boxSizing = 'border-box'
    css.width = `${box.width}px`
    css.height = `${box.height}px`
    css.lineHeight = `${box.height - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth)}px`
    css.overflow = 'hidden'
    css.whiteSpace = 'nowrap'
    for (const property of ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'textAlign', 'paddingLeft', 'paddingRight', 'color', 'backgroundColor', 'borderBottomWidth', 'borderBottomStyle', 'borderBottomColor', 'marginLeft', 'marginRight', 'marginTop', 'marginBottom'] as const) {
      css[property] = style[property]
    }
    copy.replaceWith(text)
  })

  const sourceCaps = Array.from(source.querySelectorAll<HTMLElement>('.housing-card-cap'))
  const cloneCaps = Array.from(clone.querySelectorAll<HTMLElement>('.housing-card-cap'))
  sourceCaps.forEach((cap, index) => {
    const copy = cloneCaps[index]
    const parent = cap.parentElement
    if (!copy || !parent) return
    const capBox = cap.getBoundingClientRect()
    const parentBox = parent.getBoundingClientRect()
    copy.style.transform = 'none'
    copy.style.left = `${capBox.left - parentBox.left}px`
    copy.style.top = `${capBox.top - parentBox.top}px`
  })
}

/** Tailwind sets img to display:block, which breaks html2canvas' font baseline probe and pushes all text down. */
function withProbeFix<T>(run: () => Promise<T>) {
  const style = document.createElement('style')
  style.textContent = 'body > div[style*="visibility: hidden"] > img { display: inline-block !important; vertical-align: baseline !important; }'
  document.head.appendChild(style)
  return run().finally(() => style.remove())
}

export async function downloadElementAsA4Pdf(element: HTMLElement, filename: string) {
  const canvas = await withProbeFix(() => html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    windowWidth: Math.ceil(element.scrollWidth),
    windowHeight: Math.ceil(element.scrollHeight),
    logging: false,
    onclone: (clonedDoc, cloned) => {
      const copy = cloned ?? clonedDoc.querySelector('.housing-a4')
      if (copy) {
        flattenNode(element, copy)
        if (copy instanceof HTMLElement) {
          stabilizeLayout(element, copy)
          copy.querySelectorAll('button').forEach((button) => (button.style.visibility = 'hidden'))
        }
      }
    },
  }))
  const image = canvas.toDataURL('image/jpeg', 0.95)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  pdf.addImage(image, 'JPEG', 0, 0, 210, 297)
  pdf.save(filename)
}
