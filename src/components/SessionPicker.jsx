import { sessionDuration, formatTime } from '../utils/parseWorkout'

export default function SessionPicker({ sessions, fileName, onSelect, onBack }) {
  return (
    <div className="picker-screen">
      <button className="btn-ghost back-btn" onClick={onBack}>← Back</button>
      <h2 className="picker-title">Choose a Session</h2>
      <p className="picker-file">{fileName}</p>
      <ul className="session-list">
        {sessions.map((session, i) => {
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
    </div>
  )
}
