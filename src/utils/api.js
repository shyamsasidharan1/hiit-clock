/**
 * API client — all calls go through the Lambda function URL.
 * No AWS credentials in the browser.
 */

const API = import.meta.env.VITE_API_URL?.replace(/\/$/, '') // strip trailing slash

function adminHeaders(adminToken) {
  return adminToken
    ? { 'Content-Type': 'application/json', 'x-admin-token': adminToken }
    : { 'Content-Type': 'application/json' }
}

/** List all workout files. Returns [{ key, lastModified }] */
export async function listWorkouts() {
  const res = await fetch(`${API}/workouts`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

/** Fetch raw text of a single workout file */
export async function getWorkout(key) {
  const res = await fetch(`${API}/workout?key=${encodeURIComponent(key)}`)
  if (!res.ok) throw new Error(await res.text())
  return res.text()
}

/** Save a workout file. Returns { ok } or throws with error message. */
export async function uploadWorkout(key, text, adminToken = null) {
  const res = await fetch(`${API}/workout`, {
    method: 'POST',
    headers: adminHeaders(adminToken),
    body: JSON.stringify({ key, text, isAdmin: !!adminToken }),
  })
  const data = await res.json()
  if (!res.ok) return { ok: false, error: data.error || 'Upload failed' }
  return { ok: true }
}

/** Generate a workout from a natural language description via Bedrock. */
export async function generateWorkout(description) {
  const res = await fetch(`${API}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  })
  const data = await res.json()
  if (!res.ok) return { ok: false, error: data.error || 'Generation failed' }
  return { ok: true, text: data.text }
}

/** Sanitises a workout name into a valid S3 key */
export function nameToKey(workoutName) {
  return workoutName.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') + '.txt'
}
