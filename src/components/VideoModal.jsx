import { useState, useEffect } from 'react'
import { getExerciseVideo } from '../utils/api'

export default function VideoModal({ exerciseName, onClose }) {
  const [videoId, setVideoId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    getExerciseVideo(exerciseName).then(result => {
      setLoading(false)
      if (result.ok) setVideoId(result.videoId)
      else setError('No demo video found for this exercise.')
    })
  }, [exerciseName])

  // Close on Escape key
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{exerciseName}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {loading && <p className="modal-status">Finding demo video…</p>}
          {error   && <p className="modal-status modal-error">{error}</p>}
          {videoId && (
            <iframe
              className="modal-video"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              allow="autoplay; encrypted-media"
              allowFullScreen
              title={`${exerciseName} demo`}
            />
          )}
        </div>
      </div>
    </div>
  )
}
