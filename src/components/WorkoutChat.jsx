import { useState, useRef, useEffect } from 'react'
import { generateWorkout, uploadWorkout, nameToKey } from '../utils/api'
import { parseWorkoutFile, sessionDuration, formatTime } from '../utils/parseWorkout'
import VideoModal from './VideoModal'

export default function WorkoutChat({ onBack, onSaved }) {
  const [description, setDescription] = useState('')
  const [generating, setGenerating]   = useState(false)
  const [generated, setGenerated]     = useState(null)   // { text, sessions }
  const [refineInput, setRefineInput] = useState('')
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState(null)
  const [saved, setSaved]             = useState(false)
  const [demoExercise, setDemoExercise] = useState(null)
  const refineRef = useRef(null)

  // Scroll refinement input into view when preview appears
  useEffect(() => {
    if (generated && refineRef.current) {
      refineRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [generated])

  async function handleGenerate() {
    if (!description.trim()) return
    setError(null)
    setGenerated(null)
    setGenerating(true)
    const result = await generateWorkout(description.trim())
    setGenerating(false)
    if (!result.ok) { setError(result.error); return }
    applyResult(result.text)
  }

  async function handleRefine() {
    if (!refineInput.trim() || !generated) return
    setError(null)
    setGenerating(true)
    const result = await generateWorkout(refineInput.trim(), generated.text)
    setGenerating(false)
    if (!result.ok) { setError(result.error); return }
    setRefineInput('')
    applyResult(result.text)
  }

  function applyResult(text) {
    const parsed = parseWorkoutFile(text)
    if (parsed.sessions.length === 0) {
      setError('AI returned an unexpected format. Try rephrasing.')
      return
    }
    setGenerated({ text, sessions: parsed.sessions })
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
      ...session.exercises.map(ex => {
        const base = `${ex.name}, ${ex.workDuration}, ${ex.restDuration}`
        return ex.description ? `${base}, ${ex.description}` : base
      }),
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
        {/* Initial description — hidden once generated */}
        {!generated && (
          <>
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
          </>
        )}

        {generating && (
          <div className="generating-indicator">
            <div className="generating-dots"><span /><span /><span /></div>
            <p>{generated ? 'Refining your workout…' : 'Claude is building your workout…'}</p>
          </div>
        )}

        {error && <p className="error-msg">{error}</p>}

        {generated && (
          <div className="generated-preview">
            <div className="preview-header">
              <span className="preview-label">Generated Workout</span>
              <button className="btn-ghost" onClick={() => { setGenerated(null); setRefineInput('') }}>
                Start over
              </button>
            </div>

            {generated.sessions.map((session, i) => (
              <div key={i} className="preview-session">
                <div className="preview-session-name">{session.name}</div>
                <div className="preview-session-meta">
                  {session.exercises.length} exercises · {formatTime(sessionDuration(session))}
                </div>
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Exercise</th>
                      <th>How to</th>
                      <th>Work</th>
                      <th>Rest</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.exercises.map((ex, j) => (
                      <tr key={j}>
                        <td className="ptd-name">{ex.name}</td>
                        <td className="ptd-desc">{ex.description || '—'}</td>
                        <td className="ptd-time"><span className="work-badge">{ex.workDuration}s</span></td>
                        <td className="ptd-time">{ex.restDuration > 0 ? <span className="rest-badge">{ex.restDuration}s</span> : '—'}</td>
                        <td className="ptd-demo"><button className="demo-btn-sm" onClick={() => setDemoExercise(ex.name)} title="Watch demo">▶</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            {/* Refinement input */}
            <div className="refine-section" ref={refineRef}>
              <p className="refine-label">Not quite right? Give instructions to refine:</p>
              <div className="refine-row">
                <input
                  className="field-input refine-input"
                  type="text"
                  placeholder='e.g. "increase rest to 20s" or "replace burpees with mountain climbers"'
                  value={refineInput}
                  onChange={e => setRefineInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRefine()}
                  disabled={generating}
                />
                <button
                  className="btn-secondary refine-btn"
                  onClick={handleRefine}
                  disabled={generating || !refineInput.trim()}
                >
                  {generating ? '…' : '✦ Refine'}
                </button>
              </div>
            </div>

            <button
              className="btn-primary save-btn"
              onClick={handleSave}
              disabled={saving || generating}
            >
              {saving ? 'Saving…' : 'Save to Library'}
            </button>
          </div>
        )}
      </div>

      {demoExercise && (
        <VideoModal exerciseName={demoExercise} onClose={() => setDemoExercise(null)} />
      )}
    </div>
  )
}
