# CrowdSec Threat Map

Public fork of `kabelsalatundklartext/crowdsec-threat-map-docker`.

This image displays CrowdSec alerts from a local CrowdSec database on an interactive world map. This fork keeps the original dashboard spirit and adds:

- English and French UI (`LANGUAGE=en` or `LANGUAGE=fr`)
- Larger, more readable UI text
- Optional live firewall drops panel with a violet-to-cyan style
- Optional `/drops` JSON API for external firewall/plugin integrations
- Updated Unraid template and Docker examples

The live drops feature is disabled by default. Users who only want the translated threat map do not need to mount extra files or grant extra permissions.

## Quick Start

```yaml
services:
  crowdsec-threat-map:
    image: ghcr.io/railline/crowdsec-threat-map-docker:latest
    container_name: CrowdSec-Threat-Map
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - /path/to/crowdsec/data:/crowdsec/data:ro
      - /path/to/crowdsec/postoverflows:/crowdsec/postoverflows
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - SERVER_LAT=48.8566
      - SERVER_LON=2.3522
      - SERVER_NAME=MyServer
      - LANGUAGE=en
```

Open:

```text
http://SERVER-IP:8080/
```

## Required Settings

| Variable | Description |
| --- | --- |
| `SERVER_LAT` | Latitude of your server/home marker |
| `SERVER_LON` | Longitude of your server/home marker |
| `CROWDSEC_DB_PATH` | Defaults to `/crowdsec/data/crowdsec.db` |

The container reads the CrowdSec SQLite database directly. If your CrowdSec install uses another database backend, mirror or export the data to a readable SQLite file before using this dashboard.

## Language

```yaml
environment:
  - LANGUAGE=en
```

Supported values:

- `en`
- `fr`

Unknown values fall back to English.

## Optional Live Firewall Drops

The drops panel is meant for firewall/bouncer integrations that can write dropped packets as JSONL. It is off by default at two levels:

1. Server side: `DROPS_ENABLED=false`
2. UI side: unchecked in the dashboard settings

Enable it only when you provide a drops JSONL file:

```yaml
volumes:
  - /path/to/drops:/crowdsec/drops:ro
environment:
  - DROPS_ENABLED=true
  - DROPS_LOG_PATH=/crowdsec/drops/drops.jsonl
  - DROPS_MAX_EVENTS=200
  - DROPS_MAX_AGE_SECONDS=3600
```

Expected JSONL format, one event per line:

```json
{"ts":"2026-06-19T12:30:00Z","ip":"203.0.113.10","country":"FR","packets":12,"bytes":3456,"chain":"DOCKER-USER","rule":"crowdsec-ban"}
```

Accepted aliases:

- IP: `ip`, `src_ip`, `source_ip`
- Time: `ts`, `time`, `timestamp`
- Packets: `packets`, `packet_count`
- Bytes: `bytes`, `byte_count`
- Coordinates: `lat`/`lon` or `latitude`/`longitude`

If country or coordinates are missing, the exporter tries to enrich the event with `GeoLite2-City.mmdb` when present, then falls back to country center coordinates.

### `/drops` API

```text
GET /drops
```

Response:

```json
{
  "enabled": true,
  "events": [
    {
      "ts": "2026-06-19T12:30:00Z",
      "ip": "203.0.113.10",
      "country": "FR",
      "city": "Paris",
      "lat": 48.8566,
      "lon": 2.3522,
      "packets": 12,
      "bytes": 3456,
      "chain": "DOCKER-USER",
      "rule": "crowdsec-ban"
    }
  ]
}
```

The Prometheus endpoint also exposes optional `cs_firewall_drops` metrics when drops are enabled.

## Security Notes

- Mount the CrowdSec data directory read-only when possible.
- The Docker socket is only needed for dashboard unban and whitelist restart features.
- Set `UNBAN_API_TOKEN` if `/unban` is reachable outside a trusted LAN.
- The drops feature reads a file only. It does not require Docker socket access and does not modify firewall rules.

## Unraid

An Unraid template is available in:

```text
unraid/crowdsec-threat-map.xml
```

The template exposes the translated dashboard settings and the optional drops variables as advanced fields.

## License

GPL-3.0-or-later, following the upstream project.
