FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENV=prod

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN useradd --system --no-create-home app
COPY --chown=app . .
USER app

EXPOSE 8000
# --proxy-headers: behind Caddy, trust X-Forwarded-For so the real client IP
# (not Caddy's) reaches the app. Safe because this port is never published.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", \
     "--proxy-headers", "--forwarded-allow-ips=*"]
