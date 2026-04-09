import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

const BUCKET       = process.env.S3_BUCKET
const MAX_WORKOUTS = parseInt(process.env.MAX_WORKOUTS || '50', 10)
const ADMIN_TOKEN  = process.env.ADMIN_TOKEN
const REGION       = process.env.AWS_REGION || 'us-east-1'

const s3      = new S3Client({ region: REGION })
const bedrock = new BedrockRuntimeClient({ region: REGION })

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  'https://main.dozd8zk2fm5by.amplifyapp.com',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, x-admin-token',
}

function respond(statusCode, body, extra = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...extra },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }
}

export const handler = async (event) => {
  const method = event.requestContext.http.method
  const path   = event.rawPath

  // Preflight
  if (method === 'OPTIONS') return respond(200, '')

  try {

    // ── GET /workouts — list all workout files ─────────────────────────────
    if (method === 'GET' && path === '/workouts') {
      const res   = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET }))
      const files = (res.Contents || [])
        .filter(o => o.Key.endsWith('.txt'))
        .map(o => ({ key: o.Key, lastModified: o.LastModified }))
      return respond(200, files)
    }

    // ── GET /workout?key=xxx — fetch one workout file ──────────────────────
    if (method === 'GET' && path === '/workout') {
      const key = event.queryStringParameters?.key
      if (!key) return respond(400, { error: 'Missing key parameter' })
      const res  = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
      const text = await streamToText(res.Body)
      return { statusCode: 200, headers: { 'Content-Type': 'text/plain', ...CORS_HEADERS }, body: text }
    }

    // ── POST /workout — save a workout file ────────────────────────────────
    if (method === 'POST' && path === '/workout') {
      const body    = JSON.parse(event.body || '{}')
      const { key, text, isAdmin } = body

      if (!key || !text) return respond(400, { error: 'Missing key or text' })

      // Admin uploads require a valid token
      if (isAdmin) {
        const token = event.headers?.['x-admin-token']
        if (token !== ADMIN_TOKEN) return respond(403, { error: 'Invalid admin token' })
      }

      // Enforce workout limit
      const listRes = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET }))
      const count   = (listRes.Contents || []).filter(o => o.Key.endsWith('.txt')).length
      if (count >= MAX_WORKOUTS) {
        return respond(429, { error: `Workout limit of ${MAX_WORKOUTS} reached. Contact the admin.` })
      }

      await s3.send(new PutObjectCommand({
        Bucket: BUCKET, Key: key, Body: text, ContentType: 'text/plain',
      }))
      return respond(200, { ok: true })
    }

    // ── POST /generate — generate workout text via Bedrock ─────────────────
    if (method === 'POST' && path === '/generate') {
      const body = JSON.parse(event.body || '{}')
      const { description } = body
      if (!description) return respond(400, { error: 'Missing description' })

      const prompt = buildPrompt(description)

      const bedrockRes = await bedrock.send(new InvokeModelCommand({
        modelId:     'us.anthropic.claude-haiku-4-5-20251001-v1:0',
        contentType: 'application/json',
        accept:      'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      }))

      const parsed = JSON.parse(Buffer.from(bedrockRes.body).toString('utf-8'))
      const text   = parsed.content[0].text.trim()
      return respond(200, { text })
    }

    return respond(404, { error: 'Not found' })

  } catch (err) {
    console.error('Lambda error:', err)
    return respond(500, { error: err.message })
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildPrompt(description) {
  return `You are a HIIT workout file generator. Convert the user's description into a structured workout file.

FORMAT RULES — follow exactly:
- Session name on its own line in square brackets: [Session Name]
- Each exercise: Name, work_seconds, rest_seconds
- Work and rest durations are integers (seconds). Rest can be 0.
- No extra text, no explanations, no markdown — only the formatted workout.

EXAMPLE OUTPUT:
[Morning HIIT]
Jumping Jacks, 45, 15
Push-Ups, 30, 10
Burpees, 40, 20

User's workout description:
${description}

Respond with ONLY the formatted workout text.`
}

async function streamToText(stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    stream.on('error', reject)
  })
}
