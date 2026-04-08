import { useRef, useState } from 'react'
import { parseWorkoutFile } from '../utils/parseWorkout'

export default function FileUploader({ onParsed }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState(null)
  const [fileName, setFileName] = useState(null)

  function processFile(file) {
    if (!file) return
    if (!file.name.endsWith('.txt')) {
      setError('Please upload a .txt file.')
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      const result = parseWorkoutFile(e.target.result)
      if (result.sessions.length === 0) {
        setError('No valid sessions found. Check the file format.')
        return
      }
      setFileName(file.name)
      setError(null)
      onParsed(result, file.name)
    }
    reader.readAsText(file)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    processFile(e.dataTransfer.files[0])
  }

  async function loadSample() {
    const res = await fetch('/sample-workout.txt')
    const text = await res.text()
    const result = parseWorkoutFile(text)
    setFileName('sample-workout.txt')
    setError(null)
    onParsed(result, 'sample-workout.txt')
  }

  return (
    <div className="uploader-screen">
      <h1 className="app-title">HIIT Clock</h1>
      <p className="app-subtitle">Upload a workout file and get moving.</p>

      <div
        className={`drop-zone ${dragging ? 'drag-over' : ''}`}
        onClick={() => inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <div className="drop-icon">📂</div>
        <p className="drop-text">
          {fileName ? `Loaded: ${fileName}` : 'Drop a .txt file here or click to browse'}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".txt"
          style={{ display: 'none' }}
          onChange={e => processFile(e.target.files[0])}
        />
      </div>

      {error && <p className="error-msg">{error}</p>}

      <button className="btn-secondary sample-btn" onClick={loadSample}>
        Try with sample file
      </button>

      <div className="format-hint">
        <details>
          <summary>Expected file format</summary>
          <pre>{`[Session Name]\nExercise Name, work_sec, rest_sec\n\n[Another Session]\nJumping Jacks, 45, 15`}</pre>
        </details>
      </div>
    </div>
  )
}
