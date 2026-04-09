/**
 * Parses a workout txt file string into structured data.
 * @param {string} text - Raw file contents
 * @returns {{ sessions: Session[], errors: string[] }}
 *
 * Session  = { name: string, exercises: Exercise[] }
 * Exercise = { name: string, workDuration: number, restDuration: number }
 */
export function parseWorkoutFile(text) {
  const lines = text.split(/\r?\n/)
  const sessions = []
  const errors = []
  let current = null

  lines.forEach((raw, idx) => {
    const line = raw.trim()
    const lineNum = idx + 1

    if (!line || line.startsWith('#')) return

    const sessionMatch = line.match(/^\[(.+)\]$/)
    if (sessionMatch) {
      current = { name: sessionMatch[1].trim(), exercises: [] }
      sessions.push(current)
      return
    }

    if (!current) {
      errors.push(`Line ${lineNum}: exercise found before any session header — "${line}"`)
      return
    }

    const parts = line.split(',').map(p => p.trim())
    if (parts.length < 3) {
      errors.push(`Line ${lineNum}: expected "Name, work, rest" but got — "${line}"`)
      return
    }

    const [name, workRaw, restRaw, ...descParts] = parts
    const description = descParts.join(', ').trim()
    const workDuration = parseInt(workRaw, 10)
    const restDuration = parseInt(restRaw, 10)

    if (!name) {
      errors.push(`Line ${lineNum}: exercise name is empty — "${line}"`)
      return
    }
    if (isNaN(workDuration) || workDuration <= 0) {
      errors.push(`Line ${lineNum}: invalid work duration "${workRaw}" — "${line}"`)
      return
    }
    if (isNaN(restDuration) || restDuration < 0) {
      errors.push(`Line ${lineNum}: invalid rest duration "${restRaw}" — "${line}"`)
      return
    }

    current.exercises.push({ name, workDuration, restDuration, description })
  })

  // Filter out sessions with no exercises and warn
  const validSessions = []
  sessions.forEach(s => {
    if (s.exercises.length === 0) {
      errors.push(`Session "${s.name}" has no valid exercises and was skipped.`)
    } else {
      validSessions.push(s)
    }
  })

  return { sessions: validSessions, errors }
}

/** Returns total duration of a session in seconds */
export function sessionDuration(session) {
  return session.exercises.reduce(
    (sum, ex) => sum + ex.workDuration + ex.restDuration,
    0
  )
}

/** Formats seconds as M:SS */
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
