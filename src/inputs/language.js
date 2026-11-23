import {validateRule} from './validate.js'

const examples = [
  ['20% off for Natura Casa brand, stackable with other offers', {scope:'brand',appliesTo:'Natura Casa',type:'percentage',value:20,stackable:true,minCartValue:null}],
  ['Rs.100 flat discount on all Flipkart items', {scope:'platform',appliesTo:'Flipkart',type:'flat',value:100,stackable:false,minCartValue:null}],
  ['10% off if cart value is more than Rs.5,000', {scope:'cart',appliesTo:'',type:'percentage',value:10,stackable:false,minCartValue:5000}],
  ['Give a discount for big orders', {error:'Specify the discount and minimum cart value.'}],
]

export function checkDraft(reply, description) {
  let draft
  try { draft = JSON.parse(reply) } catch { throw Error('The model returned invalid JSON. Rephrase the offer and try again.') }
  if (typeof draft?.error === 'string') throw Error(draft.error)
  const rule = validateRule(draft)
  const normalized = description.toLowerCase().replace(/(?<=\d),(?=\d)/g,'')
  const numbers = (normalized.match(/\d+(?:\.\d+)?/g) || []).map(Number)
  if (!numbers.includes(rule.value) || (rule.scope==='cart' && !numbers.includes(rule.minCartValue))) throw Error('Please state the discount and any cart threshold explicitly in digits.')
  if (rule.appliesTo && !normalized.includes(rule.appliesTo.toLowerCase())) throw Error('Please name the exact brand or platform.')
  return rule
}
export async function parseDescription(text, cart, progress) {
  if (!/\d/.test(text)) throw Error('Specify a discount amount in digits, its brand or platform, or a minimum cart value.')
  const names = key => [...new Set(cart.map(i=>i[key]))].slice(0,30).join(', ')
  const messages = [{role:'system',content:'Extract exactly one discount rule as JSON. Do not invent missing fields. If unclear, unsupported, or multiple offers are requested, return {"error":"Explain what to clarify"}. Use percentage or flat, scope brand/platform/cart. Default stackable to false. Cart thresholds are inclusive and require an explicit percentage and threshold. For cart, appliesTo is empty. Copy named targets verbatim. Known brands: '+names('brand')+'. Known platforms: '+names('platform')+'.'}]
  for (const [input,output] of examples) messages.push({role:'user',content:input},{role:'assistant',content:JSON.stringify(output)})
  messages.push({role:'user',content:text})
  const {infer} = await import('./localModel.js')
  return checkDraft(await infer(messages,progress),text)
}
