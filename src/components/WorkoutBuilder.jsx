import { useState } from 'react'
import { uploadWorkout, nameToKey } from '../utils/api'

const MAX_EXERCISES = 20

const emptyExercise = () => ({ name: '', workDuration: '', restDuration: '' })

export default function WorkoutBuilder({ onBack, onSaved }) {
  const [workoutName, setWorkoutName] = useState('')
  const [authorEmail, setAuthorEmail] = useState('')
  const [exercises, setExercises]     = useState([emptyExercise()])
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState(null)
  const [success, setSuccess]         = useState(false)

  function addExercise() {
    if (exercises.length >= MAX_EXERCISES) return
    setExercises(ex => [...ex, emptyExercise()])
  }

  function removeExercise(i) {
    setExercises(ex => ex.filter((_, idx) => idx !== i))
  }

  function updateExercise(i, field, value) {
    setExercises(ex => ex.map((e, idx) => idx === i ? { ...e, [field]: value } : e))
  }

  function validate() {
    if (!workoutName.trim()) return 'Workout name is required.'
    if (!authorEmail.trim() || !authorEmail.includes('@')) return 'A valid author email is required.'
    if (exercises.length === 0) return 'Add at least one exercise.'
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i]
      if (!ex.name.trim()) return `Exercise ${i + 1}: name is required.`
      if (!ex.workDuration || parseInt(ex.workDuration) <= 0) return `Exercise ${i + 1}: work duration must be > 0.`
      if (ex.restDuration === '' || parseInt(ex.restDuration) < 0) return `Exercise ${i + 1}: rest duration must be ≥ 0.`
    }
    return null
  }

  async function handleSave() {
    const err = validate()
    if (err) { setError(err); return }
    setError(null)
    setSaving(true)

    const lines = [
      `# Created by ${authorEmail}`,
      '',
      `[${workoutName.trim()}]`,
      ...exercises.map(ex => `${ex.name.trim()}, ${ex.workDuration}, ${ex.restDuration}`),
    ]
    const result = await uploadWorkout(nameToKey(workoutName), lines.join('\n'))
    setSaving(false)

    if (!result.ok) { setError(result.error); return }
    setSuccess(true)
    setTimeout(() => onSaved(), 1500)
  }

  if (success) {
    return (
      <div className="builder-screen">
        <div className="builder-success">
          <div className="success-icon">✓</div>
          <p>Workout saved!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="builder-screen">
      <button className="btn-ghost back-btn" onClick={onBack}>← Back</button>
      <h2 className="picker-title">Build a Workout</h2>

      <div className="builder-form">
        <div className="field-group">
          <label className="field-label">Workout Name</label>
          <input className="field-input" type="text" placeholder="e.g. Morning HIIT"
            value={workoutName} onChange={e => setWorkoutName(e.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label">Author Email</label>
          <input className="field-input" type="email" placeholder="you@example.com"
            value={authorEmail} onChange={e => setAuthorEmail(e.target.value)} />
        </div>

        <div className="exercises-header">
          <span className="field-label">Exercises ({exercises.length}/{MAX_EXERCISES})</span>
        </div>

        <div className="exercise-list">
          {exercises.map((ex, i) => (
            <div key={i} className="exercise-row">
              <div className="exercise-row-num">{i + 1}</div>
              <div className="exercise-row-fields">
                <input className="field-input" type="text" placeholder="Exercise name"
                  value={ex.name} onChange={e => updateExercise(i, 'name', e.target.value)} />
                <div className="exercise-durations">
                  <div className="duration-field">
                    <label className="duration-label">Work (s)</label>
                    <input className="field-input duration-input" type="number" min="1" placeholder="45"
                      value={ex.workDuration} onChange={e => updateExercise(i, 'workDuration', e.target.value)} />
                  </div>
                  <div className="duration-field">
                    <label className="duration-label">Rest (s)</label>
                    <input className="field-input duration-input" type="number" min="0" placeholder="15"
                      value={ex.restDuration} onChange={e => updateExercise(i, 'restDuration', e.target.value)} />
                  </div>
                </div>
              </div>
              {exercises.length > 1 && (
                <button className="remove-btn" onClick={() => removeExercise(i)}>✕</button>
              )}
            </div>
          ))}
        </div>

        {exercises.length < MAX_EXERCISES
          ? <button className="add-exercise-btn" onClick={addExercise}>+ Add Exercise</button>
          : <p className="limit-msg">Maximum of {MAX_EXERCISES} exercises reached.</p>
        }

        {error && <p className="error-msg">{error}</p>}

        <button className="btn-primary save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Workout'}
        </button>
      </div>
    </div>
  )
}
