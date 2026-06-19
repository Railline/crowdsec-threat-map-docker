#!/bin/sh
set -e

# ============================================================
# CrowdSec Threat Map — Container Entrypoint v1.6.9
# ============================================================

log() { echo "[$(date '+%F %T')] $*"; }

log "🛡️  Starting CrowdSec Threat Map..."
log "   Version: v1.6.9"

# ── Pflichtprüfungen ──
if [ -z "$SERVER_LAT" ] || [ "$SERVER_LAT" = "0.0" ]; then
    log "⚠️  SERVER_LAT is not set. Please configure it in Docker/Compose/Unraid."
fi
if [ -z "$SERVER_LON" ] || [ "$SERVER_LON" = "0.0" ]; then
    log "⚠️  SERVER_LON is not set. Please configure it in Docker/Compose/Unraid."
fi

# ── DB-Pfad prüfen ──
DB_FILE="${CROWDSEC_DB_PATH:-/crowdsec/data/crowdsec.db}"
if [ ! -f "$DB_FILE" ]; then
    log "❌ CrowdSec database not found: $DB_FILE"
    log "   Check your volume mappings."
    log "   Expected: /crowdsec/data/crowdsec.db"
    exit 1
fi
log "✅ Database found: $DB_FILE"

# ── GeoLite2 prüfen ──
MMDB_FILE="${CROWDSEC_MMDB_PATH:-/crowdsec/data/GeoLite2-City.mmdb}"
if [ -f "$MMDB_FILE" ]; then
    log "✅ GeoLite2 found: $MMDB_FILE (city display enabled)"
else
    log "ℹ️  GeoLite2 not found — city display disabled"
fi

# ── Whitelist-Info ──
WL_ENABLED="${WHITELIST_ENABLED:-true}"
if [ "$WL_ENABLED" = "true" ]; then
    log "🛡️  Dynamic whitelist: enabled (interval: ${WHITELIST_INTERVAL:-900}s)"
else
    log "ℹ️  Dynamic whitelist: disabled"
fi

# ── Umgebungsvariablen exportieren (werden vom Exporter gelesen) ──
export CROWDSEC_DB_PATH="${CROWDSEC_DB_PATH:-/crowdsec/data/crowdsec.db}"
export CROWDSEC_MMDB_PATH="${CROWDSEC_MMDB_PATH:-/crowdsec/data/GeoLite2-City.mmdb}"
export SERVER_LAT="${SERVER_LAT:-0.0}"
export SERVER_LON="${SERVER_LON:-0.0}"
export SERVER_NAME="${SERVER_NAME:-MeinServer}"
export CROWDSEC_CONTAINER_NAME="${CROWDSEC_CONTAINER:-crowdsec}"
export CACHE_TTL="${CACHE_TTL:-60}"
export DAYS_BACK="${DAYS_BACK:-365}"
export WHITELIST_ENABLED="${WHITELIST_ENABLED:-true}"
export WHITELIST_FILE="${WHITELIST_FILE:-/crowdsec/postoverflows/s01-whitelist/my-whitelist.yaml}"
export WHITELIST_INTERVAL="${WHITELIST_INTERVAL:-900}"
export CROWDSEC_RESTART_WAIT="${CROWDSEC_RESTART_WAIT:-15}"
export CROWDSEC_RESTART_COOLDOWN="${CROWDSEC_RESTART_COOLDOWN:-300}"
export UNBAN_API_TOKEN="${UNBAN_API_TOKEN:-}"
export DROPS_ENABLED="${DROPS_ENABLED:-false}"
export DROPS_LOG_PATH="${DROPS_LOG_PATH:-/crowdsec/drops/drops.jsonl}"
export DROPS_MAX_EVENTS="${DROPS_MAX_EVENTS:-200}"
export DROPS_MAX_AGE_SECONDS="${DROPS_MAX_AGE_SECONDS:-3600}"

export LANGUAGE="${LANGUAGE:-en}"

# ── index.html mit korrekter Exporter-URL patchen ──
log "🔧 Configuring dashboard..."

# Relative URL /metrics — nginx proxied intern zu Port 9456
METRICS_URL="${EXPORTER_URL:-/metrics}"

sed -i "s|http://EURE-UNRAID-IP:9456/metrics|${METRICS_URL}|g" \
    /var/www/html/index.html 2>/dev/null || true
sed -i "s|let SERVER_LAT   = [^;]*;|let SERVER_LAT   = ${SERVER_LAT};|g" \
    /var/www/html/index.html 2>/dev/null || true
sed -i "s|let SERVER_LON   = [^;]*;|let SERVER_LON   = ${SERVER_LON};|g" \
    /var/www/html/index.html 2>/dev/null || true
sed -i "s|let SERVER_NAME_MAP = '[^']*';|let SERVER_NAME_MAP = '${SERVER_NAME}';|g" \
    /var/www/html/index.html 2>/dev/null || true
log "📍 Server location: ${SERVER_LAT}, ${SERVER_LON} (${SERVER_NAME})"
if awk -v lat="$SERVER_LAT" 'BEGIN{exit !(lat+0<-90 || lat+0>90)}' 2>/dev/null; then
    log "⚠️  SERVER_LAT=${SERVER_LAT} is invalid (±90) — latitude/longitude may be swapped."
fi
if awk -v lon="$SERVER_LON" 'BEGIN{exit !(lon+0<-180 || lon+0>180)}' 2>/dev/null; then
    log "⚠️  SERVER_LON=${SERVER_LON} is invalid (±180)."
fi

# Sprache setzen (en oder fr)
LANG_VAL="${LANGUAGE:-en}"
if [ "$LANG_VAL" != "en" ] && [ "$LANG_VAL" != "fr" ]; then
    log "⚠️  LANGUAGE='${LANG_VAL}' is unknown — falling back to 'en'"
    LANG_VAL="en"
fi
sed -i "s|'LANGUAGE_PLACEHOLDER'|'${LANG_VAL}'|g" \
    /var/www/html/index.html 2>/dev/null || true
log "🌐 Language: ${LANG_VAL}"
log "▣ Drops: ${DROPS_ENABLED} (${DROPS_LOG_PATH})"

# Unban-API-Token ins Dashboard (leer = kein Token nötig)
if [ -n "$UNBAN_API_TOKEN" ]; then
    sed -i "s|UNBAN_TOKEN_PLACEHOLDER|${UNBAN_API_TOKEN}|g" \
        /var/www/html/index.html 2>/dev/null || true
    log "🔐 Unban API token: set"
else
    log "⚠️  Unban API token: not set — use unban only on a trusted LAN"
fi

log "✅ Dashboard configured (Exporter URL: ${METRICS_URL})"

# ── Nginx starten ──
log "🌐 Starting nginx (dashboard on port 8080)..."
nginx -g "daemon off;" &
NGINX_PID=$!

# ── Exporter starten ──
log "📡 Starting exporter (API on port 9456)..."
python3 /app/crowdsec_exporter.py &
EXPORTER_PID=$!

log "✅ Services are running."
log "   Dashboard: http://<EURE-IP>:8080"
log "   API direkt: http://<EURE-IP>:9456/metrics (optional)"

# ── Warten und bei Absturz neu starten ──
while true; do
    if ! kill -0 $EXPORTER_PID 2>/dev/null; then
        log "⚠️  Exporter stopped — restarting..."
        python3 /app/crowdsec_exporter.py &
        EXPORTER_PID=$!
    fi
    if ! kill -0 $NGINX_PID 2>/dev/null; then
        log "⚠️  Nginx stopped — restarting..."
        nginx -g "daemon off;" &
        NGINX_PID=$!
    fi
    sleep 10
done
