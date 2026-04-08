/**
 * AdminUploader — gated by URL token (?admin=<VITE_ADMIN_TOKEN>).
 * Lets admins preview workout files. Since this is a static site,
 * uploaded files are session-only (no persistence). For permanent
 * additions, commit files to public/workouts/ and redeploy.
 */
import { useState } from 'react'
import { parseWorkoutFile } from '../utils/parseWorkout'

export default function AdminUploader({ onLoad }) {
  const [status, setStatus] = useState(null)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.name.endsWith('.txt')) {
      setStatus({ type: 'error', msg: 'Only .txt files are supported.' })
      return
    }
    const reader = new FileReader()
    reader.onload = ev => {
      const result = parseWorkoutFile(ev.target.result)
      if (result.sessions.length === 0) {
        setStatus({ type: 'error', msg: 'No valid sessions found in file.' })
        return
      }
      setStatus({ type: 'ok', msg: `Loaded ${result.sessions.length} session(s) from "${file.name}"` })
      onLoad(result, file.name)
    }
    reader.readAsText(file)
  }

  return (
    <div className="admin-panel">
      <div className="admin-badge">Admin Mode</div>
      <h3>Upload workout file</h3>
      <p className="admin-note">
        Files uploaded here are session-only. To publish permanently, commit to{' '}
        <code>public/workouts/</code> and redeploy.
      </p>
      <input type="file" accept=".txt" onChange={handleFile} className="admin-file-input" />
      {status && (
        <p className={`admin-status ${status.type}`}>{status.msg}</p>
      )}
    </div>
  )
}
