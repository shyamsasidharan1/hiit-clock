import { useState, useEffect } from 'react'
import * as Audio from './AudioController'

const RATES = [
  { label: '0.8×', value: 0.8 },
  { label: '1.0×', value: 1.0 },
  { label: '1.2×', value: 1.2 },
]

export default function SettingsPanel({ onClose }) {
  const [voices, setVoices]   = useState([])
  const [voiceIdx, setVoiceIdx] = useState(0)
  const [rate, setRateState]  = useState(1.0)

  useEffect(() => {
    function load() {
      const v = Audio.getVoices()
      setVoices(v)
      if (v.length > 0) Audio.setVoice(v[0])
    }
    load()
    window.speechSynthesis?.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load)
  }, [])

  function selectVoice(i) {
    setVoiceIdx(i)
    Audio.setVoice(voices[i])
  }

  function selectRate(r) {
    setRateState(r)
    Audio.setRate(r)
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <span>Settings</span>
          <button className="btn-ghost close-btn" onClick={onClose}>✕</button>
        </div>

        <label className="settings-label">Voice</label>
        <select
          className="settings-select"
          value={voiceIdx}
          onChange={e => selectVoice(Number(e.target.value))}
        >
          {voices.length === 0 && <option>No English voices found</option>}
          {voices.map((v, i) => (
            <option key={i} value={i}>{v.name}</option>
          ))}
        </select>

        <label className="settings-label">Speech Rate</label>
        <div className="rate-buttons">
          {RATES.map(r => (
            <button
              key={r.value}
              className={`rate-btn ${rate === r.value ? 'active' : ''}`}
              onClick={() => selectRate(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
