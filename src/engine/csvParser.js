import Papa from 'papaparse'
import { readPrice, validateRule } from '../inputs/validate.js'

function parse(text, id, convert) {
  const {data: rows, errors: syntax} = Papa.parse(text.trim(), {
    header:true, skipEmptyLines:'greedy',
    transformHeader:h => h.trim().toLowerCase().replace(/\s+/g,'_'),
    transform:v => v.trim(),
  })
  const errors = syntax.map(e => e.message)
  const ids = new Set()
  const data = []
  rows.forEach((row,i) => {
    try {
      if (!row[id] || ids.has(row[id])) throw Error('Missing or duplicate ' + id)
      ids.add(row[id])
      data.push(convert(row))
    } catch (e) { errors.push('Row ' + (i+2) + ': ' + e.message) }
  })
  if (!rows.length) errors.push('The file contains no data rows.')
  return { data: errors.length ? [] : data, errors }
}

export function parseRulesCSV(text) {
  return parse(text, 'rule_id', r => {
    const flag = (r.stackable || '').toLowerCase()
    if (!['true','false','1','0','yes','no'].includes(flag)) throw Error('Invalid stackable flag.')
    const rule = validateRule({scope:r.scope?.toLowerCase(), appliesTo:r.applies_to || '', type:r.type?.toLowerCase(),
      value:Number(r.value), stackable:['true','1','yes'].includes(flag), minCartValue:r.min_cart_value ? Number(r.min_cart_value) : null})
    return {ruleId:r.rule_id,...rule}
  })
}
export function parseCartCSV(text) {
  return parse(text, 'item_id', r => {
    if (!r.product || !r.brand || !r.platform) throw Error('Product, brand and platform are required.')
    return {itemId:r.item_id, product:r.product, brand:r.brand, platform:r.platform, basePrice:readPrice(r.base_price)}
  })
}
