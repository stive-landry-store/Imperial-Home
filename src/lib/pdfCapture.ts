import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

function flattenNode(source: Element, clone: Element) {
  if (source instanceof HTMLElement && clone instanceof HTMLElement) {
    const style = getComputedStyle(source)
    clone.style.backgroundColor = style.backgroundColor
    clone.style.color = style.color
    clone.style.borderTopColor = style.borderTopColor
    clone.style.borderRightColor = style.borderRightColor
    clone.style.borderBottomColor = style.borderBottomColor
    clone.style.borderLeftColor = style.borderLeftColor
    clone.style.outlineColor = style.outlineColor
    clone.style.boxShadow = 'none'
    clone.style.caretColor = style.caretColor
  }
  if (source instanceof SVGElement && clone instanceof SVGElement) {
    const style = getComputedStyle(source)
    if (style.fill && style.fill !== 'none') clone.setAttribute('fill', style.fill)
    if (style.stroke && style.stroke !== 'none') clone.setAttribute('stroke', style.stroke)
  }
  const originals = Array.from(source.children)
  const copies = Array.from(clone.children)
  originals.forEach((child, index) => {
    if (copies[index]) flattenNode(child, copies[index])
  })
}

export async function downloadElementAsA4Pdf(element: HTMLElement, filename: string) {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    onclone: (clonedDoc, cloned) => {
      const copy = cloned ?? clonedDoc.querySelector('.housing-a4')
      if (copy) flattenNode(element, copy)
    },
  })
  const image = canvas.toDataURL('image/jpeg', 0.95)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  pdf.addImage(image, 'JPEG', 0, 0, 210, 297)
  pdf.save(filename)
}
