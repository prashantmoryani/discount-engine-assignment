import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { parseCartCSV, parseRulesCSV } from '../src/engine/csvParser.js'
import { quoteCart } from '../src/engine/discountEngine.js'
import { extractCart } from '../src/inputs/pdfRows.js'
import { checkDraft, parseDescription } from '../src/inputs/language.js'
const sample = (name) =>
  readFile(new URL('../sample-data/' + name, import.meta.url))
const cart = parseCartCSV(String(await sample('cart.csv'))).data
const rules = parseRulesCSV(String(await sample('rules.csv'))).data
test('all six checkout prices and separate cart offer', () => {
  const q = quoteCart(cart, rules)
  assert.deepEqual(
    q.results.map((i) => i.finalPrice),
    [1104, 629, 509, 2499, 382, 809],
  )
  assert.deepEqual(q.results[0].skippedRules, ['RULE-02'])
  assert.deepEqual(q.results[1].appliedRules, ['RULE-02', 'RULE-03'])
  assert.equal(q.results[3].reasoning, 'No offers available')
  assert.deepEqual([q.subtotal, q.offers[0].saving, q.total], [5932, 593, 5339])
})
test('inclusive threshold checked after item offers', () => {
  const quote = (price, extra = []) =>
    quoteCart([{ ...cart[3], basePrice: price }], [...rules, ...extra])
  assert.equal(quote(3999).offers.length, 0)
  assert.equal(quote(4000).total, 3600)
  assert.equal(
    quote(4000, [{ ...rules[1], appliesTo: cart[3].brand }]).offers.length,
    0,
  )
})
test('oversized flat offers stop at zero and ties choose first', () => {
  const extra = { ...rules[1], value: 5000 }
  const q = quoteCart(
    [cart[1]],
    [extra, { ...extra, ruleId: 'second' }, rules[2]],
  )
  assert.equal(q.total, 0)
  assert.deepEqual(q.results[0].skippedRules, ['second'])
})
test('multiple cart offers select best then stack in input order', () => {
  const q = quoteCart(cart, [
    ...rules,
    { ...rules[3], ruleId: 'better', value: 20 },
    { ...rules[3], ruleId: 'stack', stackable: true },
  ])
  assert.deepEqual(
    q.offers.map((o) => o.rule.ruleId),
    ['better', 'stack'],
  )
  assert.equal(q.total, 4271)
})
test('PDF bytes extract exactly the same six items as CSV', async () => {
  const task = getDocument({
    data: new Uint8Array(await sample('cart.pdf')),
    useSystemFonts: true,
  })
  try {
    const pdf = await task.promise
    const page = await pdf.getPage(1)
    assert.deepEqual(extractCart([(await page.getTextContent()).items]), cart)
  } finally {
    await task.destroy()
  }
})
test('malformed PDF row and scanned PDF fail atomically', () => {
  const line = (names, y) =>
    names.map((str, i) => ({ str, transform: [1, 0, 0, 1, i * 100, y] }))
  const header = line(['Product', 'Brand', 'Platform', 'Base Price'], 100)
  assert.throws(
    () =>
      extractCart([
        [...header, ...line(['Item', 'Brand', 'Store', 'bad'], 80)],
      ]),
    /Page 1, line 2/,
  )
  assert.throws(() => extractCart([[]]), /No cart rows/)
})
test('CSV validation preserves compatibility and rejects partial imports', () => {
  assert.equal(
    parseRulesCSV(
      'rule_id,scope,applies_to,type,value,stackable\nr,brand,AB,flat,5,no',
    ).data.length,
    1,
  )
  assert.deepEqual(
    parseCartCSV(
      'item_id,product,brand,platform,base_price\ni,a,b,c,25\nj,a,b,c,25oops',
    ).data,
    [],
  )
})
test('LLM candidates are typed, grounded and cannot set their own IDs', () => {
  const draft = {
    scope: 'platform',
    appliesTo: 'Flipkart',
    type: 'flat',
    value: 100,
    stackable: false,
    minCartValue: null,
  }
  const text = 'Rs.100 off Flipkart'
  assert.deepEqual(
    checkDraft(JSON.stringify({ ...draft, ruleId: 'override' }), text),
    draft,
  )
  for (const bad of [
    '{}',
    'not JSON',
    JSON.stringify({ ...draft, value: 120 }),
    JSON.stringify({ ...draft, stackable: 'false' }),
    JSON.stringify({ ...draft, appliesTo: 'Noon' }),
  ])
    assert.throws(() => checkDraft(bad, text))
})
test('ambiguous request prompts for clarification before model download', async () => {
  await assert.rejects(
    parseDescription('Give a discount for big orders', [], () => {}),
    /Specify a discount/,
  )
})
