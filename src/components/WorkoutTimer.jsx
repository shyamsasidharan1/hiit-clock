import { useState, useEffect, useRef, useCallback } from 'react'
import { sessionDuration, formatTime } from '../utils/parseWorkout'
import * as Audio from './AudioController'
import SettingsPanel from './SettingsPanel'

const RING_R = 88
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R

export default function WorkoutTimer({ session, onBack }) {
  const totalSessionDuration = sessionDuration(session)
  const totalWorkTime = session.exercises.reduce((s, ex) => s + ex.workDuration, 0)
  const totalRestTime = session.exercises.reduce((s, ex) => s + ex.restDuration, 0)

  // ── State ──────────────────────────────────────────────────────────────────
  const [exIdx, setExIdx]         = useState(0)
  const [phase, setPhase]         = useState('work')   // 'work' | 'rest' | 'done'
  const [timeLeft, setTimeLeft]   = useState(session.exercises[0].workDuration)
  const [running, setRunning]     = useState(false)
  const [elapsed, setElapsed]     = useState(0)
  const [muted, setMuted]         = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [pulse, setPulse]         = useState(false)

  // Audio cue flags for current interval
  const halfFired   = useRef(false)
  const countFired  = useRef(false)

  const exercise    = session.exercises[exIdx]
  const nextEx      = session.exercises[exIdx + 1]
  const phaseDur    = phase === 'work' ? exercise.workDuration : exercise.restDuration

  // ── Helpers ────────────────────────────────────────────────────────────────
  const triggerPulse = useCallback(() => {
    setPulse(true)
    setTimeout(() => setPulse(false), 400)
  }, [])

  const startPhase = useCallback((idx, ph, el, announce) => {
    halfFired.current  = false
    countFired.current = false
    const ex  = session.exercises[idx]
    const dur = ph === 'work' ? ex.workDuration : ex.restDuration
    setExIdx(idx)
    setPhase(ph)
    setTimeLeft(dur)
    setElapsed(el)
    if (announce) {
      if (ph === 'work') {
        Audio.cueWorkStart(ex.name)
        triggerPulse()
      } else {
        Audio.cueRest()
      }
    }
  }, [session, triggerPulse])

  // ── Session start ──────────────────────────────────────────────────────────
  useEffect(() => {
    Audio.cueSessionStart(session.name, session.exercises[0].name)
    triggerPulse()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Tick ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running || phase === 'done') return
    const id = setInterval(() => {
      setTimeLeft(t => {
        const next = t - 1

        // Audio cues
        const half = Math.ceil(phaseDur / 2)
        if (!halfFired.current && phase === 'work' && t === half) {
          halfFired.current = true
          Audio.cueHalfway()
        }
        if (!countFired.current && t === 4) {
          countFired.current = true
          if (phase === 'work') Audio.cueWorkEnding()
          else                  Audio.cueRestEnding()
        }

        if (next <= 0) {
          // advance elapsed by remaining t (not next) to account for the last tick
          return 0
        }
        return next
      })
      setElapsed(e => e + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [running, phase, phaseDur])

  // ── Auto-advance when timeLeft hits 0 ─────────────────────────────────────
  useEffect(() => {
    if (!running || timeLeft !== 0) return
    advance(exIdx, phase, elapsed, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, running])

  function advance(idx, ph, el, fromSkip) {
    const ex = session.exercises[idx]

    if (ph === 'work') {
      if (ex.restDuration > 0) {
        startPhase(idx, 'rest', el, true)
      } else {
        // no rest — jump straight to next exercise
        advanceToNext(idx, el, fromSkip)
      }
    } else {
      advanceToNext(idx, el, fromSkip)
    }
  }

  function advanceToNext(idx, el, fromSkip) {
    const nextIdx = idx + 1
    if (nextIdx >= session.exercises.length) {
      setPhase('done')
      setRunning(false)
      Audio.cueComplete()
    } else {
      startPhase(nextIdx, 'work', el, !fromSkip)
      if (fromSkip) {
        Audio.cueWorkStart(session.exercises[nextIdx].name)
        triggerPulse()
      }
    }
  }

  // ── Controls ───────────────────────────────────────────────────────────────
  function handleStartPause() {
    if (phase === 'done') return
    setRunning(r => !r)
  }

  function handleSkip() {
    if (phase === 'done') return
    const skippedSeconds = timeLeft
    const newElapsed = elapsed + skippedSeconds
    setRunning(false)
    Audio.cancelSpeech()
    // Use setTimeout to let state settle before advancing
    setTimeout(() => {
      advance(exIdx, phase, newElapsed, true)
      setRunning(true)
    }, 50)
  }

  function handleRestart() {
    Audio.cancelSpeech()
    setRunning(false)
    setExIdx(0)
    setPhase('work')
    setTimeLeft(session.exercises[0].workDuration)
    setElapsed(0)
    halfFired.current  = false
    countFired.current = false
  }

  function handleBack() {
    if (running) {
      if (!window.confirm('Workout in progress. Leave?')) return
    }
    Audio.cancelSpeech()
    onBack()
  }

  function toggleMute() {
    const next = !muted
    setMuted(next)
    Audio.setMuted(next)
  }

  // ── Derived display values ─────────────────────────────────────────────────
  const intervalProgress = phaseDur > 0 ? 1 - timeLeft / phaseDur : 1
  const ringOffset = RING_CIRCUMFERENCE * (1 - intervalProgress)
  const sessionProgress = Math.min(elapsed / totalSessionDuration, 1)
  const isWork = phase === 'work'

  const ringColor = (() => {
    if (phase === 'done') return '#22c55e'
    if (!isWork) return '#60a5fa'
    if (timeLeft <= 5 && phaseDur > 5) return '#f59e0b'
    return '#22c55e'
  })()

  // ── Done screen ────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div className="timer-screen">
        <div className="session-bar-wrap">
          <div className="session-bar-track">
            <div className="session-bar-fill" style={{ width: '100%' }} />
          </div>
          <span className="session-bar-label">{formatTime(totalSessionDuration)} / {formatTime(totalSessionDuration)}</span>
        </div>
        <div className="timer-stats">
          <span><span className="stat-label">Work</span> {formatTime(totalWorkTime)}</span>
          <span><span className="stat-label">Rest</span> {formatTime(totalRestTime)}</span>
          <span><span className="stat-label">Remaining</span> 0:00</span>
        </div>
        <div className="done-ring-wrap">
          <svg className="ring-svg" viewBox="0 0 200 200">
            <circle className="ring-track" cx="100" cy="100" r={RING_R} />
            <circle
              className="ring-fill done-ring"
              cx="100" cy="100" r={RING_R}
              stroke="#22c55e"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={0}
            />
          </svg>
          <div className="ring-center">
            <div className="done-check">✓</div>
            <div className="done-label">Done!</div>
          </div>
        </div>
        <p className="done-time">Total time: {formatTime(totalSessionDuration)}</p>
        <div className="controls">
          <button className="btn-primary" onClick={handleRestart}>Restart</button>
          <button className="btn-ghost" onClick={onBack}>Sessions</button>
        </div>
      </div>
    )
  }

  // ── Timer screen ───────────────────────────────────────────────────────────
  return (
    <div className="timer-screen">
      {/* Session progress bar — top strip */}
      <div className="session-bar-wrap">
        <div className="session-bar-track">
          <div className="session-bar-fill" style={{ width: `${sessionProgress * 100}%` }} />
        </div>
        <span className="session-bar-label">
          {formatTime(elapsed)} / {formatTime(totalSessionDuration)}
        </span>
      </div>

      {/* Stats row */}
      <div className="timer-stats">
        <span><span className="stat-label">Work</span> {formatTime(totalWorkTime)}</span>
        <span><span className="stat-label">Rest</span> {formatTime(totalRestTime)}</span>
        <span><span className="stat-label">Remaining</span> {formatTime(Math.max(0, totalSessionDuration - elapsed))}</span>
      </div>

      {/* Exercise counter */}
      <div className="ex-counter">
        Exercise {exIdx + 1} of {session.exercises.length}
      </div>

      {/* Circular ring */}
      <div className={`ring-wrap ${pulse ? 'pulse' : ''}`}>
        <svg className="ring-svg" viewBox="0 0 200 200">
          <circle className="ring-track" cx="100" cy="100" r={RING_R} />
          <circle
            className="ring-fill"
            cx="100" cy="100" r={RING_R}
            stroke={ringColor}
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={ringOffset}
            style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.4s ease' }}
          />
        </svg>
        <div className="ring-center">
          <div className="ring-time">{formatTime(timeLeft)}</div>
          <div className={`ring-phase phase-${isWork ? 'work' : 'rest'}`}>
            {isWork ? 'WORK' : 'REST'}
          </div>
        </div>
      </div>

      {/* Exercise card */}
      <div className="ex-card">
        <div className="ex-name">{exercise.name}</div>
        <div className="ex-next">
          Up next: {nextEx ? nextEx.name : 'Finish'}
        </div>
      </div>

      {/* Controls */}
      <div className="controls">
        <button className="ctrl-btn" onClick={handleBack} title="Back to sessions">⬅</button>
        <button className="ctrl-btn" onClick={handleRestart} title="Restart session">↺</button>
        <button className="ctrl-btn ctrl-main" onClick={handleStartPause}>
          {running ? '⏸' : '▶'}
        </button>
        <button className="ctrl-btn" onClick={handleSkip} title="Skip interval">⏭</button>
        <button className={`ctrl-btn ${muted ? 'muted' : ''}`} onClick={toggleMute} title="Toggle mute">
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* Settings */}
      <button className="settings-btn" onClick={() => setShowSettings(s => !s)} title="Settings">⚙</button>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  )
}
