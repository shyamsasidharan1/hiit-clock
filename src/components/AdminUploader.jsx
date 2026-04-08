import { useState } from 'react'
import { parseWorkoutFile } from '../utils/parseWorkout'
import { uploadWorkout, nameToKey } from '../utils/s3'

export default function AdminUploader({ onDone }) {
  const [status, setStatus] = useState(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.name.endsWith('.txt')) {
      setStatus({ type: 'error', msg: 'Only .txt files are supported.' })
      return
    }

    const reader = new FileReader()
    reader.onload = async ev => {
      const result = parseWorkoutFile(ev.target.result)
      if (result.sessions.length === 0) {
        setStatus({ type: 'error', msg: 'No valid sessions found in file.' })
        return
      }

      setUploading(true)
      const errors = []

      for (const session of result.sessions) {
        const lines = [
          `[${session.name}]`,
          ...session.exercises.map(ex => `${ex.name}, ${ex.workDuration}, ${ex.restDuration}`),
        ]
        const text = lines.join('\n')
        const key  = nameToKey(session.name)
        const res  = await uploadWorkout(key, text)
        if (!res.ok) errors.push(`"${session.name}": ${res.error}`)
      }

      setUploading(false)

      if (errors.length > 0) {
        setStatus({ type: 'error', msg: errors.join(' | ') })
      } else {
        setStatus({ type: 'ok', msg: `Uploaded ${result.sessions.length} session(s) to S3.` })
        setTimeout(() => onDone(), 1500)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="admin-panel">
      <div className="admin-badge">Admin — File Upload</div>
      <p className="admin-note">
        Upload a <code>.txt</code> file. Each session is saved as a separate workout in S3.
      </p>
      <input
        type="file"
        accept=".txt"
        onChange={handleFile}
        className="admin-file-input"
        disabled={uploading}
      />
      {uploading && <p className="admin-status ok">Uploading…</p>}
      {status && !uploading && (
        <p className={`admin-status ${status.type}`}>{status.msg}</p>
      )}
    </div>
  )
}
