/**
 * post.js — Buffer TikTok Slideshow Poster
 *
 * Usage:  node post.js --slideshow 7
 *
 * What it does automatically:
 *   1. Finds your TikTok profile from the Buffer API (no manual ID needed)
 *   2. Reads all images from slideshows/slideshow-7/slides/ in alphabetical order
 *   3. Reads your caption from slideshows/slideshow-7/caption.txt
 *   4. Stitches images into a portrait MP4 (3 sec/slide + smooth crossfades)
 *   5. Uploads the video to Buffer and schedules it for the next optimal time
 *   6. Logs the exact scheduled time and confirms success
 */

'use strict';

// ─── IMPORTS ─────────────────────────────────────────────────────────────────

require('dotenv').config();           // loads BUFFER_ACCESS_TOKEN from .env
const path   = require('path');
const fs     = require('fs');
const os     = require('os');
const axios  = require('axios');
const FormData = require('form-data');
const ffmpeg = require('fluent-ffmpeg');

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const BUFFER_API       = 'https://api.bufferapp.com/1';
const TOKEN            = process.env.BUFFER_ACCESS_TOKEN;

// Video settings
const SECONDS_PER_SLIDE = 3;          // how long each image is shown
const FADE_DURATION     = 0.5;        // crossfade between slides (seconds)
const VIDEO_WIDTH       = 1080;       // TikTok portrait width
const VIDEO_HEIGHT      = 1920;       // TikTok portrait height
const VIDEO_FPS         = 30;

// TikTok optimal posting hours (24h, in the account's local timezone).
// Buffer will pick the next slot in its queue automatically — these are
// used only for the "next optimal slot" fallback log message.
const OPTIMAL_HOURS = [7, 9, 12, 19, 21]; // 7am, 9am, noon, 7pm, 9pm

// ─── TINY HELPERS ─────────────────────────────────────────────────────────────

/** Print a success line and keep going. */
function log(msg) {
  console.log(`  ✅  ${msg}`);
}

/** Print an error and exit immediately. */
function die(msg) {
  console.error(`\n  ❌  ${msg}\n`);
  process.exit(1);
}

// ─── STEP 0 — PARSE ARGUMENTS ─────────────────────────────────────────────────

/**
 * Read the --slideshow N flag from the command line.
 * Example: node post.js --slideshow 12  →  returns 12
 */
function parseSlideshowNumber() {
  const idx = process.argv.indexOf('--slideshow');

  if (idx === -1 || !process.argv[idx + 1]) {
    die('Usage: node post.js --slideshow <number>   (e.g.  node post.js --slideshow 7)');
  }

  const n = parseInt(process.argv[idx + 1], 10);

  if (isNaN(n) || n < 7 || n > 50) {
    die('Slideshow number must be between 7 and 50.');
  }

  return n;
}

// ─── STEP 1 — READ SLIDES & CAPTION ───────────────────────────────────────────

/**
 * Returns a sorted array of absolute paths for all images inside slides/.
 * Supported formats: .jpg .jpeg .png .webp
 */
function getSlides(slideshowDir) {
  const slidesDir = path.join(slideshowDir, 'slides');

  if (!fs.existsSync(slidesDir)) {
    die(`Could not find slides/ folder at:\n     ${slidesDir}`);
  }

  const SUPPORTED = ['.jpg', '.jpeg', '.png', '.webp'];

  const files = fs.readdirSync(slidesDir)
    .filter(f => SUPPORTED.includes(path.extname(f).toLowerCase()))
    .sort()                                          // alphabetical = your intended order
    .map(f => path.join(slidesDir, f));

  if (files.length === 0) {
    die(
      `No images found in:\n     ${slidesDir}\n\n` +
      `     Drop .jpg or .png files there and try again.`
    );
  }

  return files;
}

/**
 * Reads caption.txt and returns the trimmed text.
 * Exits if the file is missing or empty.
 */
function getCaption(slideshowDir) {
  const captionFile = path.join(slideshowDir, 'caption.txt');

  if (!fs.existsSync(captionFile)) {
    die(`caption.txt not found at:\n     ${captionFile}`);
  }

  const text = fs.readFileSync(captionFile, 'utf8').trim();

  if (!text) {
    die(`caption.txt is empty — add your TikTok caption text and try again.`);
  }

  return text;
}

// ─── STEP 2 — FIND TIKTOK PROFILE ─────────────────────────────────────────────

/**
 * Calls Buffer's /profiles endpoint and returns the ID of your TikTok profile.
 * Dies with a helpful message if no TikTok profile is connected.
 */
async function getTikTokProfileId() {
  let response;

  try {
    response = await axios.get(`${BUFFER_API}/profiles.json`, {
      params: { access_token: TOKEN },
      timeout: 15000,
    });
  } catch (err) {
    const msg = err.response?.data?.error || err.message;
    die(`Buffer API request failed: ${msg}\n\n     Check that your BUFFER_ACCESS_TOKEN in .env is correct.`);
  }

  const profiles = response.data;

  // Buffer returns the service name as "tiktok" (lowercase)
  const tiktok = profiles.find(p =>
    p.service === 'tiktok' || p.service_type === 'tiktok'
  );

  if (!tiktok) {
    die(
      'No TikTok account found in your Buffer profiles.\n\n' +
      '     Go to https://buffer.com and connect your TikTok account first,\n' +
      '     then run this script again.'
    );
  }

  log(`TikTok profile found: @${tiktok.service_username} (ID: ${tiktok.id})`);
  return tiktok.id;
}

// ─── STEP 3 — STITCH IMAGES INTO MP4 ─────────────────────────────────────────

/**
 * Uses FFmpeg to turn an array of image paths into a single portrait MP4.
 *
 * Each image is shown for SECONDS_PER_SLIDE seconds.
 * A smooth "fade" crossfade transition connects each pair of slides.
 *
 * outputPath — where to write the temporary .mp4 file
 */
function createVideo(slides, outputPath) {
  return new Promise((resolve, reject) => {

    // ── Single slide: just hold it for SECONDS_PER_SLIDE ──────────────────
    if (slides.length === 1) {
      ffmpeg()
        .input(slides[0])
        .inputOptions(['-loop 1', `-t ${SECONDS_PER_SLIDE}`])
        .outputOptions([
          `-vf scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:force_original_aspect_ratio=decrease,` +
            `pad=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${VIDEO_FPS}`,
          '-c:v libx264',
          '-pix_fmt yuv420p',
          '-movflags faststart',
        ])
        .output(outputPath)
        .on('end', resolve)
        .on('error', err => reject(wrapFfmpegError(err)))
        .run();
      return;
    }

    // ── Multiple slides: chain xfade transitions ───────────────────────────
    const cmd = ffmpeg();

    // Add every image as a looped input lasting SECONDS_PER_SLIDE seconds
    slides.forEach(img => {
      cmd.input(img).inputOptions(['-loop 1', `-t ${SECONDS_PER_SLIDE}`]);
    });

    const filterParts = [];

    // 1. Scale + pad every input to 1080×1920 black-letterboxed portrait
    slides.forEach((_, i) => {
      filterParts.push(
        `[${i}:v]` +
        `scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:force_original_aspect_ratio=decrease,` +
        `pad=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:(ow-iw)/2:(oh-ih)/2:black,` +
        `setsar=1,fps=${VIDEO_FPS}` +
        `[v${i}]`
      );
    });

    // 2. Chain xfade between each pair of scaled inputs
    //
    //    offset formula: slide i ends at  i * SECONDS_PER_SLIDE
    //    but each previous xfade ate FADE_DURATION off the timeline, so:
    //    offset[i] = i * SECONDS_PER_SLIDE - i * FADE_DURATION
    //
    let prevLabel = 'v0';

    for (let i = 1; i < slides.length; i++) {
      const offset    = i * SECONDS_PER_SLIDE - i * FADE_DURATION;
      const outLabel  = i === slides.length - 1 ? 'out' : `xf${i}`;

      filterParts.push(
        `[${prevLabel}][v${i}]` +
        `xfade=transition=fade:duration=${FADE_DURATION}:offset=${offset}` +
        `[${outLabel}]`
      );

      prevLabel = outLabel;
    }

    cmd
      .complexFilter(filterParts, 'out')
      .outputOptions([
        '-c:v libx264',
        '-pix_fmt yuv420p',
        '-movflags faststart',
      ])
      .output(outputPath)
      .on('start', cmdStr => {
        // Show just the beginning of the FFmpeg command so you can see it's working
        console.log(`\n  🎬  FFmpeg running… (${slides.length} slides → ${outputPath.split('/').pop()})`);
      })
      .on('end', resolve)
      .on('error', err => reject(wrapFfmpegError(err)))
      .run();
  });
}

/** Wraps an FFmpeg error with install instructions. */
function wrapFfmpegError(err) {
  if (err.message.includes('spawn') || err.message.includes('ENOENT')) {
    return new Error(
      'FFmpeg is not installed or not in your PATH.\n\n' +
      '     Install it with ONE of these commands:\n' +
      '       Mac:     brew install ffmpeg\n' +
      '       Windows: winget install --id Gyan.FFmpeg\n' +
      '       Linux:   sudo apt install ffmpeg\n\n' +
      '     Then run this script again.'
    );
  }
  return new Error(`FFmpeg error: ${err.message}`);
}

// ─── STEP 4 — UPLOAD VIDEO & SCHEDULE VIA BUFFER ─────────────────────────────

/**
 * Uploads the MP4 to Buffer and schedules it on your TikTok for the next
 * available optimal time slot in your Buffer queue.
 *
 * Buffer scheduling strategy:
 *   - We omit `scheduled_at` so Buffer uses YOUR saved posting schedule
 *     (set at buffer.com → Settings → Posting Schedule).
 *   - If you haven't configured a schedule, Buffer posts immediately.
 *   - The scheduled time is read from the API response and logged below.
 */
async function uploadAndSchedule(profileId, videoPath, caption) {

  // ── 4a. Upload the video file to Buffer ─────────────────────────────────
  //
  //   Buffer's media upload endpoint accepts a multipart file and returns
  //   a hosted media URL used in the next step.
  //
  const form = new FormData();
  form.append('access_token', TOKEN);
  form.append('file', fs.createReadStream(videoPath), {
    filename: 'slideshow.mp4',
    contentType: 'video/mp4',
  });

  let mediaId;

  try {
    console.log('\n  📤  Uploading video to Buffer…');

    const uploadRes = await axios.post(
      `${BUFFER_API}/profiles/${profileId}/media.json`,
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
        maxBodyLength: Infinity,   // allow large files
        maxContentLength: Infinity,
        timeout: 120_000,          // 2 minutes — give slow connections time
      }
    );

    // Buffer returns an object with an `id` field for the uploaded media
    mediaId = uploadRes.data?.id;

    if (!mediaId) {
      // Unexpected response shape — log it so you can debug
      console.error('  ⚠️  Unexpected upload response:', JSON.stringify(uploadRes.data));
      die('Buffer did not return a media ID. See response logged above.');
    }

    log(`Video uploaded successfully (media ID: ${mediaId})`);

  } catch (err) {
    const detail = err.response?.data?.error || err.response?.data?.message || err.message;
    die(`Video upload failed: ${detail}`);
  }

  // ── 4b. Create the scheduled TikTok post ───────────────────────────────
  //
  //   We pass the media ID returned above.
  //   Leaving out `scheduled_at` tells Buffer to use your posting schedule.
  //
  let scheduleRes;

  try {
    console.log('  📅  Scheduling post…');

    scheduleRes = await axios.post(
      `${BUFFER_API}/updates/create.json`,
      null,
      {
        params: {
          access_token: TOKEN,
          'profile_ids[]': profileId,
          text: caption,
          'media[video]': mediaId,
        },
        timeout: 30_000,
      }
    );

  } catch (err) {
    const detail = err.response?.data?.error || err.response?.data?.message || err.message;
    die(`Scheduling failed: ${detail}`);
  }

  return scheduleRes.data;
}

// ─── STEP 5 — COMPUTE NEXT OPTIMAL SLOT (for display only) ───────────────────

/**
 * Returns a human-readable string for the next optimal posting time
 * in the current local timezone.  This is only used in the success log —
 * Buffer controls the actual schedule via your saved posting schedule.
 */
function nextOptimalSlotString() {
  const now  = new Date();
  const today = new Date(now);

  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + dayOffset);

    for (const hour of OPTIMAL_HOURS) {
      candidate.setHours(hour, 0, 0, 0);
      if (candidate > now) {
        return candidate.toLocaleString(undefined, {
          weekday: 'short',
          month:   'short',
          day:     'numeric',
          hour:    'numeric',
          minute:  '2-digit',
        });
      }
    }
  }

  return 'soon'; // fallback (should never reach this)
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {

  // ── Guard: token must be set ──────────────────────────────────────────────
  if (!TOKEN || TOKEN === 'paste_your_token_here') {
    die(
      'Missing API key.\n\n' +
      '     Open  buffer/.env  and replace  paste_your_token_here\n' +
      '     with your Buffer access token from https://buffer.com/developers/apps'
    );
  }

  // ── Guard: FFmpeg must be installed ──────────────────────────────────────
  await new Promise((resolve, reject) => {
    ffmpeg.getAvailableFormats(err => {
      if (err) {
        reject(new Error(
          'FFmpeg not found.\n\n' +
          '     Install it with ONE of these commands:\n' +
          '       Mac:     brew install ffmpeg\n' +
          '       Windows: winget install --id Gyan.FFmpeg\n' +
          '       Linux:   sudo apt install ffmpeg\n\n' +
          '     Then run this script again.'
        ));
      } else {
        resolve();
      }
    });
  }).catch(err => die(err.message));

  // ── Parse which slideshow to post ─────────────────────────────────────────
  const slideshowNum = parseSlideshowNumber();
  const slideshowDir = path.join(__dirname, 'slideshows', `slideshow-${slideshowNum}`);

  if (!fs.existsSync(slideshowDir)) {
    die(`slideshow-${slideshowNum} folder doesn't exist at:\n     ${slideshowDir}`);
  }

  console.log(`\n  📂  Loading slideshow-${slideshowNum}…\n`);

  // ── Read content ──────────────────────────────────────────────────────────
  const slides  = getSlides(slideshowDir);
  const caption = getCaption(slideshowDir);

  log(`${slides.length} slide(s) found`);
  log(`Caption: "${caption.length > 70 ? caption.slice(0, 67) + '…' : caption}"`);

  // ── Find TikTok profile ───────────────────────────────────────────────────
  const profileId = await getTikTokProfileId();

  // ── Create video ──────────────────────────────────────────────────────────
  const tmpVideo = path.join(os.tmpdir(), `buffer_slideshow_${slideshowNum}_${Date.now()}.mp4`);

  await createVideo(slides, tmpVideo);

  const fileSizeMB = (fs.statSync(tmpVideo).size / 1024 / 1024).toFixed(1);
  log(`Video created — ${fileSizeMB} MB`);

  // ── Upload & schedule ──────────────────────────────────────────────────────
  const result = await uploadAndSchedule(profileId, tmpVideo, caption);

  // Clean up the temp file regardless of outcome
  try { fs.unlinkSync(tmpVideo); } catch (_) {}

  // ── Log success ───────────────────────────────────────────────────────────
  const update = result?.updates?.[0];

  // Buffer returns `scheduled_at` as a Unix timestamp (seconds)
  const scheduledTime = update?.scheduled_at
    ? new Date(update.scheduled_at * 1000).toLocaleString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : nextOptimalSlotString();   // fallback: show our own computed optimal time

  console.log('\n  ────────────────────────────────────────────');
  console.log(`  🎉  Done!`);
  console.log(`  📅  Scheduled for: ${scheduledTime}`);
  if (update?.id) {
    console.log(`  🆔  Post ID:       ${update.id}`);
  }
  console.log(`  🔗  View queue at:  https://buffer.com`);
  console.log('  ────────────────────────────────────────────\n');
}

// Run and catch any unhandled errors with a clean message
main().catch(err => die(err.message));
