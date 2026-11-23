import { useEffect, useRef, useState } from 'react'
export default function FileInput({ label, accept, load, onData }) {
  const latest = useRef(0)
  const [status, setStatus] = useState('')
  useEffect(
    () => () => {
      latest.current++
    },
    [],
  )
  async function change(e) {
    const file = e.target.files[0]
    if (!file) return
    const request = ++latest.current
    e.target.value = ''
    setStatus('Reading ' + file.name + '…')
    try {
      if (file.size > 10 * 1024 * 1024)
        throw Error('Choose a file under 10 MB.')
      const rows = await load(file)
      if (request === latest.current) {
        onData(rows)
        setStatus(file.name + ' loaded.')
      }
    } catch (err) {
      if (request === latest.current) setStatus('Upload failed. ' + err.message)
    }
  }
  return (
    <div>
      <label>
        {label}
        <input type="file" accept={accept} onChange={change} />
      </label>
      <small role="status">{status}</small>
    </div>
  )
}
