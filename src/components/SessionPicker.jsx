import { useState, useEffect } from 'react'
import { listWorkouts, getWorkout, deleteWorkout } from '../utils/api'
import { parseWorkoutFile, sessionDuration, formatTime } from '../utils/parseWorkout'

export default function SessionPicker({ onSelect, onBack, onBuild, onGenerate, refreshKey }) {
  const [workouts, setWorkouts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [deleting, setDeleting]   = useState(null)

  useEffect(() => { load() }, [refreshKey])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const files = await listWorkouts()
      const results = await Promise.all(
        files.map(async f => {
          const text = await getWorkout(f.key)
          const { sessions } = parseWorkoutFile(text)
          return sessions.map(s => ({ ...s, key: f.key }))
        })
      )
      setWorkouts(results.flat())
    } catch (e) {
      setError('Could not load workouts. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(e, key) {
    e.stopPropagation()
    if (!window.confirm('Delete this workout?')) return
    setDeleting(key)
    await deleteWorkout(key)
    setDeleting(null)
    load()
  }

  return (
    <div className="picker-screen">
      <div className="picker-header-row">
        <h2 className="picker-title">Workouts</h2>
        <button className="btn-ghost" onClick={onBuild}>+ Build</button>
      </div>

      <div className="ai-generate-card" onClick={onGenerate}>
        <div className="ai-generate-icon">✦</div>
        <div className="ai-generate-text">
          <div className="ai-generate-title">Generate your own workout</div>
          <div className="ai-generate-subtitle">Tell AI what you want — it builds the plan for you</div>
          <div className="ai-generate-example">"10 min core workout, 40s work 15s rest, no equipment"</div>
        </div>
      </div>

      {loading && <p className="picker-loading">Loading workouts…</p>}
      {error   && <p className="error-msg">{error}</p>}

      {!loading && !error && workouts.length === 0 && (
        <p className="picker-empty">
          No workouts yet. Use <strong>AI Generate</strong> or <strong>Build</strong> to create one.
        </p>
      )}

      {!loading && !error && workouts.length > 0 && (
        <ul className="session-list">
          {workouts.map((session, i) => {
            const total = sessionDuration(session)
            return (
              <li key={i} className="session-card" onClick={() => onSelect(session)}>
                <div className="session-card-main">
                  <div className="session-name">{session.name}</div>
                  <div className="session-meta">
                    <span>{session.exercises.length} exercises</span>
                    <span className="dot">·</span>
                    <span>{formatTime(total)}</span>
                  </div>
                </div>
                <button
                  className="delete-btn"
                  onClick={e => handleDelete(e, session.key)}
                  disabled={deleting === session.key}
                  title="Delete workout"
                >
                  {deleting === session.key ? '…' : '🗑'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
