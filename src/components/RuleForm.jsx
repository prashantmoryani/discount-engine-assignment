import { useState } from 'react'
import { parseDescription } from '../inputs/language.js'

export default function RuleForm({ cart, onConfirm }) {
  const [text, setText] = useState('')
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function parse() {
    setBusy(true)
    setMessage('Starting on-device AI…')
    try {
      setDraft(await parseDescription(text, cart, setMessage))
      setMessage('')
    } catch (e) {
      setMessage(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section>
      <h2>Add an offer</h2>
      <label htmlFor="offer">Describe one discount rule</label>
      <textarea
        id="offer"
        maxLength={500}
        value={text}
        disabled={busy}
        onChange={(e) => {
          setText(e.target.value)
          setDraft(null)
          setMessage('')
        }}
        placeholder="20% off for Natura Casa brand, stackable with other offers"
      />
      <small>
        The first parse downloads a 491 MB language model. It runs on your
        device and stays loaded while this page is open.
      </small>
      <p role="status">{message}</p>
      {draft ? (
        <div className="review">
          <h3>Review parsed rule</h3>
          <dl>
            {Object.entries({
              Scope: draft.scope,
              'Applies to': draft.appliesTo || 'Entire cart',
              Type: draft.type,
              Value:
                draft.type === 'percentage'
                  ? draft.value + '%'
                  : '₹' + draft.value,
              Stackable: draft.stackable ? 'Yes' : 'No',
              'Minimum cart value':
                draft.minCartValue == null
                  ? '—'
                  : '₹' + draft.minCartValue + ' or more',
            }).map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <button
            onClick={() => {
              onConfirm(draft)
              setDraft(null)
              setText('')
              setMessage('Rule added.')
            }}
          >
            Confirm rule
          </button>{' '}
          <button
            className="secondary"
            onClick={() => {
              setDraft(null)
              setMessage('Draft discarded.')
            }}
          >
            Discard
          </button>
        </div>
      ) : (
        <button onClick={parse} disabled={!text.trim() || busy}>
          {busy ? 'Parsing…' : 'Parse rule'}
        </button>
      )}
    </section>
  )
}
