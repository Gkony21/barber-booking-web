/**
 * Greek capitals carry no accents ("ΚΛΕΙΣΕ", not "ΚΛΕΊΣΕ"). Browsers drop them when they uppercase
 * text marked lang="el", but not every browser does. Where this one does not, accents are removed
 * from the text that is shown in capitals; everything else is left as it is.
 */

const ACCENTED = /[άέήίόύώΐΰΆΈΉΊΌΎΏ]/
const PLAIN: Record<string, string> = {
  ά: 'α', έ: 'ε', ή: 'η', ί: 'ι', ό: 'ο', ύ: 'υ', ώ: 'ω', ΐ: 'ϊ', ΰ: 'ϋ',
  Ά: 'Α', Έ: 'Ε', Ή: 'Η', Ί: 'Ι', Ό: 'Ο', Ύ: 'Υ', Ώ: 'Ω',
}

export function withoutTonos(text: string): string {
  return text.replace(/[άέήίόύώΐΰΆΈΉΊΌΎΏ]/g, (letter) => PLAIN[letter])
}

// Accented capitals are wider than plain ones, so equal widths mean the browser dropped the accents.
function browserDropsAccents(): boolean {
  const probe = (text: string) => {
    const span = document.createElement('span')
    span.lang = 'el'
    span.textContent = text
    span.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-size:40px;text-transform:uppercase'
    document.body.append(span)
    const width = span.getBoundingClientRect().width
    span.remove()
    return width
  }
  return probe('άέήίόύώ') === probe('αεηιουω')
}

function fix(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentElement
    if (parent && ACCENTED.test(node.nodeValue ?? '') && getComputedStyle(parent).textTransform === 'uppercase') {
      node.nodeValue = withoutTonos(node.nodeValue!)
    }
    return
  }
  node.childNodes.forEach(fix)
}

/** Watches the page and fixes capitals as React renders them, only where the browser needs it. */
export function fixGreekCapitals(root: HTMLElement) {
  if (browserDropsAccents()) return
  fix(root)
  new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') fix(record.target)
      else record.addedNodes.forEach(fix)
    }
  }).observe(root, { childList: true, subtree: true, characterData: true })
}
