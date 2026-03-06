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

# bundle the person seg model so it doesn't download at runtime
RUN python -c "from ultralytics import YOLO; YOLO('yolo26n-seg.pt')" \
    && mkdir -p /app/app/model \
    && mv yolo26n-seg.pt /app/app/model/yolo26n-seg.pt

COPY app /app/app
COPY asgi.py /app/asgi.py

EXPOSE 8000

CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-8000} --workers 1 --worker-class uvicorn.workers.UvicornWorker --timeout 300 asgi:app"]
