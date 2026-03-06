FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app \
    YOLO_MODEL_SOURCE=app/model/jersey_number_yolo11m.pt \
    PERSON_MODEL_SOURCE=app/model/yolo26n-seg.pt \
    DETECTION_STRATEGY=detection_first \
    FPS=2 \
    CONF_THRESHOLD_EXPORT=0.55 \
    PORT=8000

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    curl unzip \
    && rm -rf /var/lib/apt/lists/*

# deno is needed by yt-dlp for YouTube JS extraction
RUN curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh
ENV DENO_DIR=/tmp/deno

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN python -m pip install --upgrade pip && pip install -r /app/requirements.txt

# bundle models so they don't download at runtime
# person seg: download standard yolov8n-seg and store under the expected filename
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n-seg.pt')" \
    && mkdir -p /app/app/model \
    && mv yolov8n-seg.pt /app/app/model/yolo26n-seg.pt

# jersey number model: download yolo11m as base; replace with trained weights at build time
# if app/model/jersey_number_yolo11m.pt exists it will be copied in the COPY step below
RUN python -c "from ultralytics import YOLO; YOLO('yolo11m.pt')" \
    && mv yolo11m.pt /app/app/model/jersey_number_yolo11m.pt

COPY app /app/app
# if a trained jersey number model was supplied in app/model/, it overwrites the placeholder
RUN ls -lh /app/app/model/
COPY asgi.py /app/asgi.py

EXPOSE 8000

CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-8000} --workers 1 --worker-class uvicorn.workers.UvicornWorker --timeout 300 asgi:app"]
