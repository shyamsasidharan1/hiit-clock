import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

const BUCKET   = import.meta.env.VITE_S3_BUCKET
const REGION   = import.meta.env.VITE_AWS_REGION
const MAX      = parseInt(import.meta.env.VITE_MAX_WORKOUTS || '50', 10)

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId:     import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
})

/** List all workout objects in the bucket. Returns array of { key, name, lastModified } */
export async function listWorkouts() {
  const cmd = new ListObjectsV2Command({ Bucket: BUCKET })
  const res = await s3.send(cmd)
  return (res.Contents || [])
    .filter(o => o.Key.endsWith('.txt'))
    .map(o => ({
      key:          o.Key,
      name:         o.Key.replace('.txt', '').replace(/_/g, ' '),
      lastModified: o.LastModified,
    }))
}

/** Fetch and return text content of a single workout file */
export async function getWorkout(key) {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  const res = await s3.send(cmd)
  return streamToText(res.Body)
}

/** Upload a workout txt string to S3. Returns { ok, error } */
export async function uploadWorkout(key, text) {
  const count = await getWorkoutCount()
  if (count >= MAX) {
    return { ok: false, error: `Workout limit of ${MAX} reached. Please contact the admin.` }
  }
  const cmd = new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        text,
    ContentType: 'text/plain',
  })
  await s3.send(cmd)
  return { ok: true }
}

/** Returns current number of workout files in the bucket */
export async function getWorkoutCount() {
  const workouts = await listWorkouts()
  return workouts.length
}

/** Converts a ReadableStream (S3 Body) to a string */
async function streamToText(stream) {
  const chunks = []
  const reader = stream.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const bytes = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0))
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return new TextDecoder().decode(bytes)
}

/** Sanitises a workout name into a valid S3 key */
export function nameToKey(workoutName) {
  return workoutName.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') + '.txt'
}
