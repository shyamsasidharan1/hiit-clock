import { useState } from 'react'
import SessionPicker from './components/SessionPicker'
import SessionPreview from './components/SessionPreview'
import WorkoutTimer from './components/WorkoutTimer'
import WorkoutBuilder from './components/WorkoutBuilder'
import WorkoutChat from './components/WorkoutChat'
import AdminUploader from './components/AdminUploader'

const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN

function isAdmin() {
  if (!ADMIN_TOKEN) return false
  const params = new URLSearchParams(window.location.search)
  return params.get('admin') === ADMIN_TOKEN
}

// screens: 'pick' | 'preview' | 'build' | 'generate' | 'timer' | 'admin'
export default function App() {
  const [screen, setScreen]         = useState('pick')
  const [session, setSession]       = useState(null)
  const [admin]                     = useState(isAdmin)
  const [refreshKey, setRefreshKey] = useState(0)
  const [speechSupported]           = useState(() => !!window.speechSynthesis)

  function handleSaved() {
    setRefreshKey(k => k + 1)
    setScreen('pick')
  }

  return (
    <div className="app">
      {!speechSupported && (
        <div className="speech-warning">
          Audio cues are not supported in this browser. Consider using Chrome.
        </div>
      )}

      {screen === 'pick' && (
        <>
          {admin && (
            <div className="admin-bar">
              <button className="btn-ghost admin-toggle" onClick={() => setScreen('admin')}>
                ⚙ Admin Upload
              </button>
            </div>
          )}
          <SessionPicker
            onSelect={s => { setSession(s); setScreen('preview') }}
            onBuild={() => setScreen('build')}
            onGenerate={() => setScreen('generate')}
            refreshKey={refreshKey}
          />
        </>
      )}

      {screen === 'build' && (
        <WorkoutBuilder onBack={() => setScreen('pick')} onSaved={handleSaved} />
      )}

      {screen === 'generate' && (
        <WorkoutChat onBack={() => setScreen('pick')} onSaved={handleSaved} />
      )}

      {screen === 'admin' && (
        <div className="admin-screen">
          <button className="btn-ghost back-btn" onClick={() => setScreen('pick')}>← Back</button>
          <AdminUploader onDone={() => { setRefreshKey(k => k + 1); setScreen('pick') }} />
        </div>
      )}

      {screen === 'preview' && session && (
        <SessionPreview
          session={session}
          onStart={() => setScreen('timer')}
          onBack={() => setScreen('pick')}
        />
      )}

      {screen === 'timer' && session && (
        <WorkoutTimer session={session} onBack={() => setScreen('preview')} />
      )}
    </div>
  )
}
