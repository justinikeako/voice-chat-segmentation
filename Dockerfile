# ── Stage 1: Build React frontend ─────────────────────────────────────────────
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --production=false
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python backend + serve built frontend ───────────────────────────
FROM python:3.10-slim
WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ unixodbc-dev curl && \
    rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend
COPY app/ ./app/
COPY run.py seed.py ./
COPY .env* ./

# Copy built frontend from stage 1
COPY --from=frontend-build /app/frontend/build ./frontend/build

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/analyse/speech-token || exit 1

CMD ["python", "run.py"]
