import {useState} from 'react'
import DataTable from './components/DataTable.jsx'
import FileInput from './components/FileInput.jsx'
import RuleForm from './components/RuleForm.jsx'
import {parseCartCSV,parseRulesCSV} from './engine/csvParser.js'
import {quoteCart} from './engine/discountEngine.js'
import sampleRules from '../sample-data/rules.csv?raw'
import sampleCart from '../sample-data/cart.csv?raw'
import samplePDF from '../sample-data/cart.pdf?url'

const RULES_COLUMNS = [
  { key: 'ruleId',    label: 'Rule ID' },
  { key: 'scope',     label: 'Scope',      render: (v) => v.charAt(0).toUpperCase() + v.slice(1) },
  { key: 'appliesTo', label: 'Applies To', render:(v)=>v || 'Entire cart' },
  {key:'minCartValue', label:'Minimum cart', render:v=>v==null?'—':'₹'+v.toLocaleString('en-IN')},
  { key: 'type',      label: 'Type',       render: (v) => v.charAt(0).toUpperCase() + v.slice(1) },
  {
    key: 'value',
    label: 'Value',
    render: (v, row) => row.type === 'percentage' ? `${v}% off` : `Rs.${v} off`,
  },
  { key: 'stackable', label: 'Stackable',  render: (v) => (v ? 'Yes' : 'No') },
]

const CART_COLUMNS = [
  { key: 'itemId',    label: 'Item' },
  { key: 'product',   label: 'Product' },
  { key: 'brand',     label: 'Brand' },
  { key: 'platform',  label: 'Platform' },
  { key: 'basePrice', label: 'Base Price', render: (v) => `Rs.${v.toLocaleString('en-IN')}` },
]

const RESULTS_COLUMNS = [
  { key: 'itemId',    label: 'Item' },
  { key: 'product',   label: 'Product' },
  { key: 'basePrice', label: 'Base Price',  render: (v) => `Rs.${v.toLocaleString('en-IN')}` },
  { key: 'finalPrice',label: 'Final Price',
    render: (v, row) => (
      <span style={{ fontWeight: 700, color: row.totalDiscount > 0 ? '#1e5c2c' : '#131A48' }}>
        Rs.{v.toLocaleString('en-IN')}
      </span>
    ),
  },
  {
    key: 'totalDiscount',
    label: 'You Save',
    render: (v) =>
      v > 0 ? (
        <span style={{ color: '#1e5c2c', fontWeight: 600 }}>Rs.{v.toLocaleString('en-IN')}</span>
      ) : (
        <span style={{ color: '#888' }}>—</span>
      ),
  },
  {
    key: 'reasoning',
    label: 'Offer Applied',
    render: (v) => (
      <span style={{ color: v === 'No offers available' ? '#888' : '#131A48', fontStyle: v === 'No offers available' ? 'italic' : 'normal' }}>
        {v}
      </span>
    ),
  },
]

const money=n=>'₹'+n.toLocaleString('en-IN')
function checked(parse,text) {
  const result=parse(text)
  if(result.errors.length) throw Error(result.errors.join(' '))
  return result.data
}
async function loadCart(file) {
  if (/\.pdf$/i.test(file.name)) return (await import('./inputs/pdf.js')).readCartPDF(file)
  return checked(parseCartCSV,await file.text())
}
export default function App() {
  const [rules,setRules]=useState([])
  const [cart,setCart]=useState([])
  const [version,resetInputs]=useState(0)
  const quote=quoteCart(cart,rules)
  function sample() {
    setRules(checked(parseRulesCSV,sampleRules))
    setCart(checked(parseCartCSV,sampleCart))
    resetInputs(n=>n+1)
  }
  return <><header><strong>Opptra</strong><span>Discount engine</span></header><main>
    <div className="title"><div><h1>Cart pricing</h1><p>Load a cart and its offers to see what the customer pays.</p></div><button onClick={sample}>Load sample cart &amp; rules</button></div>
    <div className="inputs" key={version}><section><h2>Discount rules</h2><FileInput label="Upload rules CSV" accept=".csv" load={async f=>checked(parseRulesCSV,await f.text())} onData={setRules}/>
    {rules.length>0 && <details><summary>View {rules.length} active rules</summary><DataTable columns={RULES_COLUMNS} rows={rules}/></details>}</section>
    <section><h2>Cart items</h2><FileInput label="Upload cart CSV or PDF" accept=".csv,.pdf" load={loadCart} onData={setCart}/>
    <a href={samplePDF} download="cart.pdf">Download sample PDF</a>
    {cart.length>0 && <details><summary>View {cart.length} cart items</summary><DataTable columns={CART_COLUMNS} rows={cart}/></details>}</section></div>
    {cart.length>0 && <section aria-label="Checkout"><h2>Checkout summary</h2><DataTable columns={RESULTS_COLUMNS} rows={quote.results}/>
    <div className="receipt"><p>Item subtotal <b>{money(quote.subtotal)}</b></p>{quote.offers.map(({rule,saving})=><p className="saving" key={rule.ruleId}>Cart offer · {rule.value}% off ({rule.ruleId}) <b>−{money(saving)}</b></p>)}<p className="total">Final cart total <b>{money(quote.total)}</b></p></div></section>}
    <RuleForm key={'form'+version} cart={cart} onConfirm={rule=>setRules(old=>[...old,{...rule,ruleId:crypto.randomUUID()}])}/>
  </main></>
}
