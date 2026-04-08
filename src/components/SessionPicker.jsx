import { useState, useEffect } from 'react'
import { listWorkouts, getWorkout } from '../utils/s3'
import { parseWorkoutFile, sessionDuration, formatTime } from '../utils/parseWorkout'

export default function SessionPicker({ onSelect, onBack, onBuild, refreshKey }) {
  const [workouts, setWorkouts] = useState([])   // [{ key, sessions }]
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    load()
  }, [refreshKey])

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
      setError('Could not load workouts from storage. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="picker-screen">
      <div className="picker-header-row">
        <button className="btn-ghost back-btn" onClick={onBack}>← Back</button>
        <button className="btn-secondary" onClick={onBuild}>+ Build Workout</button>
      </div>

      <h2 className="picker-title">Available Workouts</h2>

      {loading && <p className="picker-loading">Loading workouts…</p>}
      {error   && <p className="error-msg">{error}</p>}

      {!loading && !error && workouts.length === 0 && (
        <p className="picker-empty">No workouts yet. Build one or ask an admin to upload a file.</p>
      )}

      {!loading && !error && workouts.length > 0 && (
        <ul className="session-list">
          {workouts.map((session, i) => {
            const total = sessionDuration(session)
            return (
              <li key={i} className="session-card" onClick={() => onSelect(session)}>
                <div className="session-name">{session.name}</div>
                <div className="session-meta">
                  <span>{session.exercises.length} exercises</span>
                  <span className="dot">·</span>
                  <span>{formatTime(total)}</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
