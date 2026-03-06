# Player Jersey Identification API

FastAPI micro-service that detects a target player in a video by jersey color and number.  
Returns timestamped detections for downstream integration.

## Architecture

```
Video → ffmpeg (2 FPS frames)
  → YOLOv8-seg person detection (yolo26n-seg.pt, batch)
  → HSV color-ratio filter (18-color range table)
  → Jersey number model on torso crops (jersey_number_yolo11m.pt, imgsz=320)
  → Position-prior scoring → confidence export filter
```

**Dual-model pipeline (`detection_first` strategy):**

| Model | File | Purpose |
|-------|------|---------|
| YOLOv8n-seg | `app/model/yolo26n-seg.pt` | Person instance segmentation (COCO) |
| YOLOv11m | `app/model/jersey_number_yolo11m.pt` | Jersey number recognition (classes 0-99) |

## Folder Structure

```text
app/
  model/
    jersey_number_yolo11m.pt   # jersey number model (0-99)
    yolo26n-seg.pt             # person segmentation model
  routes/
    detect.py                  # POST /detect endpoint
    health.py                  # GET /health endpoint
  schemas/
    detect.py                  # Pydantic request/response models
  services/
    detection_runtime.py       # PipelineSettings, dataclasses
    detection_detector.py      # YOLO inference wrappers
    detection_pipeline.py      # Main detection orchestrator
    detection_service.py       # Top-level entry point
  main.py                      # FastAPI app factory + lifespan
asgi.py                        # ASGI entry point for gunicorn/uvicorn
Dockerfile
requirements.txt
```

## Install

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux/macOS
pip install -r requirements.txt
```

## Run Locally

```bash
python -m uvicorn asgi:app --host 0.0.0.0 --port 8000
```

## API Contract

### Health

`GET /health`

```json
{ "status": "ok" }
```

### Detect

`POST /detect`

Request:

```json
{
  "video_url": "https://www.youtube.com/watch?v=EXAMPLE",
  "jersey_number": 2,
  "jersey_color": "white",
  "sport": "basketball",
  "position": "guard"
}
```

Alternative source fields (mutually exclusive):
- `video_path` — local/server file path
- `video_bytes_b64` — base64-encoded video bytes

Response:

```json
[
  { "timestamp": 8.4, "confidence": 0.92 },
  { "timestamp": 9.1, "confidence": 0.88 }
]
```

## Environment Variables

All settings can be tuned via env vars. See `.env.example` for the full list.

| Variable | Default | Description |
|----------|---------|-------------|
| `YOLO_MODEL_SOURCE` | `app/model/jersey_number_yolo11m.pt` | Path to jersey number model |
| `PERSON_MODEL_SOURCE` | `app/model/yolo26n-seg.pt` | Path to person segmentation model |
| `DETECTION_STRATEGY` | `detection_first` | Pipeline strategy |
| `FPS` | `2` | Frames per second to sample |
| `CONF_THRESHOLD_EXPORT` | `0.55` | Minimum confidence for exported detections |
| `POSITION_PRIOR_WEIGHT` | `0.10` | Weight for position-based scoring |
| `YOUTUBE_CLIP_SECONDS` | `120` | Max seconds to download from YouTube |
| `DEBUG_VIDEO_PATH` | _(unset)_ | Set a path to write annotated debug video |

## Docker

Build:

```bash
docker build -t layer1-cv:latest .
```

Run:

```bash
docker run --rm -p 8000:8000 layer1-cv:latest
```

Override settings:

```bash
docker run --rm -p 8000:8000 \
  -e FPS=3 \
  -e CONF_THRESHOLD_EXPORT=0.60 \
  -e DEBUG_VIDEO_PATH=/tmp/debug.mp4 \
  layer1-cv:latest
```
