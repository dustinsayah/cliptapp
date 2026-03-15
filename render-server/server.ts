import express from 'express'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { v4 as uuidv4 } from 'uuid'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import type { ReelCompositionProps, ClipInput } from '../remotion/types'

const app = express()
app.use(express.json({ limit: '50mb' }))

// ── In-memory job store ───────────────────────────────────────────────────────
interface Job {
  status: string        // 'rendering', 'rendering:45', 'succeeded', 'failed'
  url?: string
  error?: string
}
const jobs = new Map<string, Job>()

// Bundle is cached after first build to avoid re-bundling on every request
let bundleCache: string | null = null

async function getBundle(): Promise<string> {
  if (bundleCache) return bundleCache
  console.log('[render-server] Bundling Remotion composition...')
  bundleCache = await bundle({
    entryPoint: path.join(process.cwd(), 'remotion/Root.tsx'),
    webpackOverride: (config) => config,
  })
  console.log('[render-server] Bundle complete:', bundleCache.slice(0, 80))
  return bundleCache
}

function calcTotalFrames(input: ReelCompositionProps): number {
  const fps = 30
  const titleFrames = 6 * fps
  const statsFrames = Object.values(input.statsData ?? {}).some(v => v?.trim()) ? 5 * fps : 0
  const clipsFrames = (input.clips ?? []).reduce((sum: number, clip: ClipInput) => {
    if (clip.trimDuration != null) return sum + Math.round(clip.trimDuration * fps)
    const s = clip.trimStart ?? 0
    const e = clip.trimEnd ?? (clip.duration ?? 10)
    return sum + Math.round(Math.max(e - s, 1) * fps)
  }, 0)
  const endFrames = 5 * fps
  return titleFrames + statsFrames + clipsFrames + endFrames
}

// ── POST /render ──────────────────────────────────────────────────────────────
app.post('/render', async (req, res) => {
  const jobId = uuidv4()
  jobs.set(jobId, { status: 'rendering' })
  res.json({ jobId })

  const input = req.body as ReelCompositionProps
  console.log(`[render-server] Job ${jobId} started — ${input.clips?.length ?? 0} clips`)

  try {
    const serveUrl = await getBundle()
    const totalFrames = Math.max(calcTotalFrames(input), 30)

    const composition = await selectComposition({
      serveUrl,
      id: 'HighlightReel',
      inputProps: input as unknown as Record<string, unknown>,
    })
    composition.durationInFrames = totalFrames
    composition.width  = input.width  || 1920
    composition.height = input.height || 1080

    const outputPath = path.join(os.tmpdir(), `reel-${jobId}.mp4`)

    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: input as unknown as Record<string, unknown>,
      imageFormat: 'jpeg',
      jpegQuality: 85,
      videoBitrate: '4M',
      onProgress: ({ progress }) => {
        const pct = Math.round(progress * 100)
        jobs.set(jobId, { status: `rendering:${pct}` })
      },
    })

    console.log(`[render-server] Job ${jobId} rendered — uploading to Cloudinary...`)

    // Upload to Cloudinary
    const FormData = (await import('form-data')).default
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeFetch = (await import('node-fetch')).default as any

    const form = new FormData()
    form.append('file',           fs.createReadStream(outputPath))
    form.append('upload_preset',  process.env.CLOUDINARY_UPLOAD_PRESET || 'clipt_uploads')
    form.append('resource_type',  'video')
    form.append('folder',         'clipt-renders')

    const cloudRes  = await nodeFetch(
      `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`,
      { method: 'POST', body: form }
    )
    const cloudData = await cloudRes.json() as { secure_url?: string; error?: { message: string } }

    if (!cloudData.secure_url) {
      throw new Error(`Cloudinary upload failed: ${cloudData.error?.message ?? 'no secure_url'}`)
    }

    fs.unlinkSync(outputPath)
    jobs.set(jobId, { status: 'succeeded', url: cloudData.secure_url })
    console.log(`[render-server] Job ${jobId} succeeded — ${cloudData.secure_url}`)

  } catch (err) {
    const msg = (err as Error).message
    console.error(`[render-server] Job ${jobId} failed:`, msg)
    jobs.set(jobId, { status: 'failed', error: msg })
    // Clean up temp file if it exists
    const outputPath = path.join(os.tmpdir(), `reel-${jobId}.mp4`)
    try { fs.unlinkSync(outputPath) } catch { /* ignore */ }
  }
})

// ── GET /status/:jobId ────────────────────────────────────────────────────────
app.get('/status/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId)
  if (!job) {
    res.status(404).json({ error: 'Job not found' })
    return
  }
  res.json(job)
})

// ── GET /health ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/live', (_req, res) => {
  res.json({ status: 'ok' })
})

// ── Pre-warm bundle on startup ────────────────────────────────────────────────
getBundle().catch(err => {
  console.warn('[render-server] Bundle pre-warm failed (will retry on first request):', err.message)
  bundleCache = null
})

const port = process.env.PORT || 4000
app.listen(port, () => {
  console.log(`[render-server] Listening on port ${port}`)
})
