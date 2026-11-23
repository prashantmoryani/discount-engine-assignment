import {readPrice} from './validate.js'

const headings = ['product','brand','platform','base price']
export function extractCart(pages) {
  const items = []
  let columns
  for (const [p, tokens] of pages.entries()) {
    const lines = []
    for (const token of tokens.filter(t => t.str.trim()).sort((a,b) => b.transform[5]-a.transform[5])) {
      const y = token.transform[5]
      let line = lines.at(-1)
      if (!line || Math.abs(line.y-y)>2) lines.push(line={y,tokens:[]})
      line.tokens.push(token)
    }
    for (const [n,line] of lines.entries()) {
      const words = line.tokens.sort((a,b) => a.transform[4]-b.transform[4])
      const joined = words.map(t => t.str.trim()).join(' ').toLowerCase().replace(/\s+/g,' ')
      if (joined === headings.join(' ')) {
        columns = ['product','brand','platform','base'].map(h => words.find(t => t.str.trim().toLowerCase().split(/\s+/)[0]===h)?.transform[4])
        if (columns.some(x => x == null)) throw Error('The PDF needs four separate table columns.')
        continue
      }
      if (!columns || /^(?:order\s*#|date\s*:|page\s+\d+\b)/i.test(joined)) continue
      const cells = ['','','','']
      for (const t of words) {
        const index = columns.findLastIndex(x => t.transform[4]>=x-3)
        if (index < 0) throw Error('Unexpected text outside the table on page '+(p+1))
        cells[index] = (cells[index]+' '+t.str.trim()).trim()
      }
      try {
        const [product,brand,platform,price] = cells
        if (!product || !brand || !platform) throw Error('Missing product, brand or platform.')
        items.push({itemId:'ITEM-'+String(items.length+1).padStart(2,'0'),product,brand,platform,basePrice:readPrice(price)})
      } catch(e) { throw Error('Page '+(p+1)+', line '+(n+1)+': '+e.message+' Check this row and upload again.') }
    }
  }
  if (!items.length) throw Error('No cart rows found. Use a text PDF with Product, Brand, Platform and Base Price columns.')
  return items
}
