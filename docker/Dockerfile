FROM python:3.12-alpine

LABEL org.opencontainers.image.title="CrowdSec Threat Map"
LABEL org.opencontainers.image.description="CrowdSec threat map with English/French UI and optional live firewall drops"
LABEL org.opencontainers.image.source="https://github.com/Railline/crowdsec-threat-map-docker"
LABEL org.opencontainers.image.licenses="GPL-3.0-or-later"
LABEL org.opencontainers.image.authors="kabelsalatundklartext, Railline"
LABEL org.opencontainers.image.version="1.6.9"

# nginx fuer Dashboard + docker-cli fuer Unban via docker exec
RUN apk add --no-cache nginx docker-cli curl \
    && pip install --no-cache-dir maxminddb

# App-Verzeichnisse
RUN mkdir -p /app /crowdsec/data /crowdsec/postoverflows /var/www/html /run/nginx

# Exporter
COPY crowdsec_exporter.py /app/crowdsec_exporter.py

# Dashboard
COPY index.html /var/www/html/index.html
COPY assets /var/www/html/assets

# nginx-Konfiguration
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Entrypoint
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Port 8080 = Dashboard (nginx)
# Port 9456 = Exporter-API (Python) — nur intern, nginx proxied
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -sf http://localhost:9456/metrics > /dev/null || exit 1

ENTRYPOINT ["/entrypoint.sh"]
