# nw-ts — Raspberry Pi netwerk-logger

TypeScript-daemon die elke 30 seconden ping/DNS/HTTP meet, elk halfuur een WAN-speedtest doet, en alles in één SQLite-tabel zet. Bedoeld om een netwerkprobleem vast te leggen tot het zich voordoet.

`wan_utilization_pct`, `wan_errors` en `wan_drops` staan in het schema maar blijven in v1 `NULL`.

## Vereisten (Pi)

- Raspberry Pi OS (Linux)
- Node.js 20 LTS
- `iproute2` en `iputils-ping` (standaard aanwezig)
- [Ookla Speedtest CLI](https://www.speedtest.net/apps/cli) (`speedtest`)

### Node 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential
```

`build-essential` is nodig om `better-sqlite3` te compileren.

### Speedtest CLI

Volg de officiële Linux-installatie tot `speedtest --version` werkt. Eerste run accepteert de logger `--accept-license` en `--accept-gdpr`. Ontbreekt het binary, dan blijven `wan_download_mbps` / `wan_upload_mbps` `NULL` (fout in journald).

## Installatie

```bash
sudo mkdir -p /opt/nw-ts /var/lib/nw-logger
sudo chown pi:pi /opt/nw-ts /var/lib/nw-logger
cd /opt/nw-ts
git clone <repo-url> .
cp config.example.json config.json
```

Zet in `config.json` o.a.:

```json
"dbPath": "/var/lib/nw-logger/network.db"
```

```bash
npm ci
npm install --prefix web
npm run build
sudo cp systemd/nw-logger.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now nw-logger
```

Pas in de unit `User=` en `WorkingDirectory=` aan als je niet als `pi` onder `/opt/nw-ts` draait.

Logs:

```bash
journalctl -u nw-logger -f
```

Stop / herstart:

```bash
sudo systemctl restart nw-logger
```

Lokaal (WSL of Pi, zonder systemd):

```bash
cp config.example.json config.json
npm ci
npm install --prefix web
npm run build
npm start
```

## Config

Standaard: `config.json` in de working directory. Override pad met `NW_CONFIG`. Ontbreekt het bestand, dan gelden de defaults uit `config.example.json`.

| Veld | Default | Betekenis |
|---|---|---|
| `intervalMs` | `30000` | Ping/DNS/HTTP-tick |
| `speedtestIntervalMs` | `1800000` | Speedtest (30 min); eerste tick start er meteen één |
| `pingCount` | `5` | ICMP-echo's per host |
| `pingTimeoutSec` | `1` | `ping -W` per echo |
| `gateway` | `auto` | IPv4-default via `ip -4 route`; of een vast IP |
| `internet1` / `internet2` | `1.1.1.1` / `8.8.8.8` | Internet-pingdoelen |
| `dnsQuery` | `cloudflare.com` | A-record lookup |
| `httpUrl` | Cloudflare `cdn-cgi/trace` | Kleine GET |
| `dbPath` | `./data/network.db` | SQLite-bestand |
| `speedtestCommand` | `speedtest` | Ookla CLI |
| `dashboardHost` | `0.0.0.0` | Bind-adres HTTP-dashboard (LAN) |
| `dashboardPort` | `8080` | Poort HTTP-dashboard |

Env-overrides: `NW_INTERVAL_MS`, `NW_SPEEDTEST_INTERVAL_MS`, `NW_PING_COUNT`, `NW_PING_TIMEOUT_SEC`, `NW_HTTP_TIMEOUT_MS`, `NW_DNS_TIMEOUT_MS`, `NW_GATEWAY`, `NW_INTERNET1`, `NW_INTERNET2`, `NW_DNS_QUERY`, `NW_HTTP_URL`, `NW_DB_PATH`, `NW_SPEEDTEST_COMMAND`, `NW_DASHBOARD_HOST`, `NW_DASHBOARD_PORT`.

## Dashboard

De daemon serveert een ingebouwd web-dashboard op poort **8080** (standaard op alle interfaces). Open in je browser:

```text
http://<pi-ip>:8080
```

Het dashboard toont KPI-kaarten (laatste ping/DNS/HTTP/speedtest) en grafieken voor latency, packet loss en speedtest. Periode: 1u / 6u / 24u / 7d; auto-refresh elke 30 seconden.

**Geen login** — bedoeld voor gebruik op je thuisnetwerk (LAN). Zet geen poort-forwarding naar het internet.

`npm run build` compileert zowel de daemon (`dist/`) als de SPA (`web/dist/`). Zonder `web/dist` geeft de daemon een korte melding; run opnieuw `npm run build`.

### Dashboard lokaal ontwikkelen

Terminal 1 — daemon (API op `:8080`):

```bash
npm run dev
```

Terminal 2 — Vite dev-server (proxy naar API):

```bash
npm run dev:web
```

Open `http://localhost:5173`.

## Schema (`samples`)

Eén rij per 30s-tick. Speedtest-kolommen zijn alleen gevuld op de tick ná een voltooide speedtest. Ping/DNS/HTTP blijven tijdens een speedtest lopen.

Mislukte probes: `*_ping_ms` / `dns_ms` / `http_ms` = `NULL`; packet loss = `100`; HTTP-status = `0`.

## CSV-export

```bash
npm run export-csv
# of:
node dist/export-csv.js /tmp/samples.csv
```

Gebruikt dezelfde `config.json` / `NW_DB_PATH` als de daemon.

## Incident-analyse

```bash
sqlite3 /var/lib/nw-logger/network.db
```

```sql
SELECT timestamp, gateway_ping_ms, gateway_packet_loss,
       internet1_ping_ms, internet1_packet_loss,
       internet2_packet_loss, dns_ms, http_ms, http_status
FROM samples
WHERE gateway_packet_loss > 0
   OR internet1_packet_loss > 0
   OR http_status IS NULL OR http_status >= 500 OR http_status = 0
ORDER BY timestamp;
```

Interpretatie:

- Gateway slecht, internet ook slecht → LAN/WiFi/Pi-kant
- Gateway goed, beide internet-IPs slecht → WAN/ISP/modem
- Pings goed, DNS hoog/fout → DNS
- Pings goed, HTTP traag/fout → pad naar die URL of HTTP-laag
- Alleen slecht op rijen met `wan_download_mbps NOT NULL` → congestion door de speedtest zelf

## Deploy na wijzigingen

```bash
cd /opt/nw-ts
git pull
npm ci
npm install --prefix web
npm run build
sudo systemctl restart nw-logger
```
