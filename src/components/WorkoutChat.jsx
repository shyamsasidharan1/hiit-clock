import { useState } from 'react'
import { generateWorkout, uploadWorkout, nameToKey } from '../utils/api'
import { parseWorkoutFile, sessionDuration, formatTime } from '../utils/parseWorkout'

export default function WorkoutChat({ onBack, onSaved }) {
  const [description, setDescription] = useState('')
  const [generating, setGenerating]   = useState(false)
  const [generated, setGenerated]     = useState(null)   // { text, sessions }
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState(null)
  const [saved, setSaved]             = useState(false)

  async function handleGenerate() {
    if (!description.trim()) return
    setError(null)
    setGenerated(null)
    setGenerating(true)

    const result = await generateWorkout(description.trim())
    setGenerating(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    const parsed = parseWorkoutFile(result.text)
    if (parsed.sessions.length === 0) {
      setError('AI returned an unexpected format. Try rephrasing your description.')
      return
    }

    setGenerated({ text: result.text, sessions: parsed.sessions })
  }

  async function handleSave() {
    if (!generated) return
    setSaving(true)
    setError(null)

    const results = await Promise.all(
      generated.sessions.map(s =>
        uploadWorkout(nameToKey(s.name), buildSessionText(s))
      )
    )

    setSaving(false)
    const failed = results.find(r => !r.ok)
    if (failed) { setError(failed.error); return }

    setSaved(true)
    setTimeout(() => onSaved(), 1500)
  }

  function buildSessionText(session) {
    return [
      `[${session.name}]`,
      ...session.exercises.map(ex => `${ex.name}, ${ex.workDuration}, ${ex.restDuration}`),
    ].join('\n')
  }

  if (saved) {
    return (
      <div className="builder-screen">
        <div className="builder-success">
          <div className="success-icon">✓</div>
          <p>Workout saved to library!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="builder-screen">
      <button className="btn-ghost back-btn" onClick={onBack}>← Back</button>
      <h2 className="picker-title">AI Workout Generator</h2>
      <p className="chat-subtitle">Describe your workout and AI will build it for you.</p>

      <div className="chat-form">
        <textarea
          className="chat-input"
          placeholder={`e.g. "A 10 minute full body HIIT workout with 6 exercises, 40 seconds work and 20 seconds rest each"`}
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
          disabled={generating}
        />

        <button
          className="btn-primary generate-btn"
          onClick={handleGenerate}
          disabled={generating || !description.trim()}
        >
          {generating ? 'Generating…' : '✦ Generate Workout'}
        </button>

        {generating && (
          <div className="generating-indicator">
            <div className="generating-dots">
              <span /><span /><span />
            </div>
            <p>Claude is building your workout…</p>
          </div>
        )}

        {error && <p className="error-msg">{error}</p>}

        {generated && (
          <div className="generated-preview">
            <div className="preview-header">
              <span className="preview-label">Generated Workout</span>
              <button className="btn-ghost" onClick={() => { setGenerated(null); setSaved(false) }}>
                Try again
              </button>
            </div>

            {generated.sessions.map((session, i) => (
              <div key={i} className="preview-session">
                <div className="preview-session-name">{session.name}</div>
                <div className="preview-session-meta">
                  {session.exercises.length} exercises · {formatTime(sessionDuration(session))}
                </div>
                <ul className="preview-exercise-list">
                  {session.exercises.map((ex, j) => (
                    <li key={j} className="preview-exercise">
                      <span className="preview-ex-name">{ex.name}</span>
                      <span className="preview-ex-times">
                        <span className="work-badge">{ex.workDuration}s</span>
                        {ex.restDuration > 0 && (
                          <span className="rest-badge">{ex.restDuration}s rest</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <button
              className="btn-primary save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save to Library'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
