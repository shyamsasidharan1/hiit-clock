import { useState } from 'react'
import { sessionDuration, formatTime } from '../utils/parseWorkout'
import VideoModal from './VideoModal'

export default function SessionPreview({ session, onStart, onBack }) {
  const [demoExercise, setDemoExercise] = useState(null)
  const total = sessionDuration(session)

  return (
    <div className="builder-screen">
      <button className="btn-ghost back-btn" onClick={onBack}>← Back</button>

      <div className="preview-session" style={{ marginTop: '8px' }}>
        <div className="preview-session-name">{session.name}</div>
        <div className="preview-session-meta">
          {session.exercises.length} exercises · {formatTime(total)}
        </div>

        <table className="preview-table">
          <thead>
            <tr>
              <th>Exercise</th>
              <th>How to</th>
              <th>Work</th>
              <th>Rest</th>
            </tr>
          </thead>
          <tbody>
            {session.exercises.map((ex, i) => (
              <tr key={i}>
                <td className="ptd-name">
                  {ex.name}
                  <button className="demo-btn-sm" onClick={() => setDemoExercise(ex.name)}>Demo</button>
                </td>
                <td className="ptd-desc">{ex.description || '—'}</td>
                <td className="ptd-time"><span className="work-badge">{ex.workDuration}s</span></td>
                <td className="ptd-time">{ex.restDuration > 0 ? <span className="rest-badge">{ex.restDuration}s</span> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="btn-primary save-btn" onClick={onStart}>
        ▶ Start Workout
      </button>

      {demoExercise && (
        <VideoModal exerciseName={demoExercise} onClose={() => setDemoExercise(null)} />
      )}
    </div>
  )
}
