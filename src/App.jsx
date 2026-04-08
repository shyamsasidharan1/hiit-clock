import { useState, useEffect } from 'react'
import FileUploader from './components/FileUploader'
import SessionPicker from './components/SessionPicker'
import WorkoutTimer from './components/WorkoutTimer'
import AdminUploader from './components/AdminUploader'

const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN

function isAdmin() {
  if (!ADMIN_TOKEN) return false
  const params = new URLSearchParams(window.location.search)
  return params.get('admin') === ADMIN_TOKEN
}

// 'upload' | 'pick' | 'timer'
export default function App() {
  const [screen, setScreen] = useState('upload')
  const [parsed, setParsed] = useState(null)   // { sessions, errors }
  const [fileName, setFileName] = useState(null)
  const [session, setSession] = useState(null)
  const [admin]   = useState(isAdmin)
  const [speechSupported] = useState(() => !!window.speechSynthesis)

  function handleParsed(result, name) {
    setParsed(result)
    setFileName(name)
    setScreen('pick')
  }

  function handleSelect(s) {
    setSession(s)
    setScreen('timer')
  }

  return (
    <div className="app">
      {!speechSupported && (
        <div className="speech-warning">
          Audio cues are not supported in this browser. Consider using Chrome.
        </div>
      )}

      {admin && screen === 'upload' && (
        <AdminUploader onLoad={handleParsed} />
      )}

      {screen === 'upload' && (
        <FileUploader onParsed={handleParsed} />
      )}

      {screen === 'pick' && parsed && (
        <SessionPicker
          sessions={parsed.sessions}
          fileName={fileName}
          onSelect={handleSelect}
          onBack={() => setScreen('upload')}
        />
      )}

      {screen === 'timer' && session && (
        <WorkoutTimer
          session={session}
          onBack={() => setScreen('pick')}
        />
      )}

      {parsed?.errors?.length > 0 && screen !== 'timer' && (
        <div className="parse-warnings">
          <strong>Warnings:</strong>
          <ul>
            {parsed.errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
