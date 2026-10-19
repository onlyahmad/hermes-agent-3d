# Hermes Agent 3D Command Center

Web dashboard 3D dengan React + Three.js + React Three Fiber. Tampilan ruang 3D adalah visualisasi konseptual; status live hanya ditampilkan dari endpoint yang benar-benar berhasil dihubungi.

## Arsitektur

```text
Browser
  └─ Nginx web (port 8088)
       └─ /api/* → Node API proxy (private Docker network)
            ├─ 9Router: GET {ROUTER_BASE_URL}/models (OpenAI-compatible)
            ├─ Hermes status: GET {HERMES_BASE_URL}{HERMES_STATUS_PATH} (opsional, endpoint deployment Anda)
            └─ Hermes logs: GET {HERMES_BASE_URL}{HERMES_LOGS_PATH} (opsional, endpoint deployment Anda)

Hermes Agent ── OpenAI-compatible API ──> 9Router ──> model-custom / provider
```

Proxy menjaga API key di sisi server dan mencegah browser mengakses secret. UI tidak menampilkan statistik CPU/RAM atau log sintetis sebagai data live.

## Jalankan di Proxmox/LXC

Prasyarat: LXC Linux yang sudah menjalankan Docker Engine + Docker Compose plugin, koneksi internet untuk build image, dan akses ke endpoint 9Router.

```bash
cp .env.example .env
nano .env
# Set ROUTER_BASE_URL, ROUTER_API_KEY, ROUTER_MODEL
# Isi HERMES_* hanya setelah Anda memastikan endpoint API Hermes yang benar.
docker compose up -d --build
docker compose ps
curl -fsS http://127.0.0.1:8088/api/health
```

Buka `http://IP-LXC:8088` dari LAN. Ganti `WEB_PORT` di `.env` bila port 8088 digunakan.

## Endpoint dan data live

- `GET /api/health`: health internal proxy, bukan bukti Hermes atau router sehat.
- `GET /api/status`: memeriksa `GET {ROUTER_BASE_URL}/models` memakai bearer key; status Hermes hanya diperiksa jika status path dikonfigurasi.
- `GET /api/models`: proxy ke endpoint OpenAI-compatible `/models`.
- `GET /api/logs`: proxy ke endpoint log Hermes yang Anda konfigurasi. Jika tidak diset, UI menampilkan keterangan belum dikonfigurasi; tidak mengarang log.

**Penting:** `HERMES_STATUS_PATH` dan `HERMES_LOGS_PATH` sengaja kosong secara default. Jangan menganggap Hermes Agent menyediakan REST API status/log universal. Tentukan endpoint berdasarkan versi, gateway, atau wrapper yang benar-benar Anda jalankan. Bila Hermes hanya menulis log ke stdout, opsi yang lebih tepat adalah membuat adapter server-side yang membaca Docker logs secara terkontrol, atau mengekspor log ke Loki/Promtail; jangan membuka Docker socket ke web UI.

9Router base URL contoh: `https://9router.ahmadlab.my.id/v1`; model contoh: `model-custom`. API key harus valid untuk endpoint tersebut. Jangan memasukkan key ke React/Vite variables (`VITE_*`) karena nilainya akan masuk bundle browser.

## Keamanan produksi

- `.env` berisi rahasia; jangan commit ke Git. Atur permission: `chmod 600 .env`.
- Batasi port 8088 ke LAN/VPN lewat firewall/reverse proxy dan gunakan HTTPS di reverse proxy.
- Jangan mempublikasikan endpoint admin, log sensitif, shell tools, atau Docker socket ke internet.
- Tambahkan autentikasi dashboard sebelum akses multi-user/public. Contoh ini belum memiliki login/authorization UI.
- Gunakan key terpisah dan hak akses minimum jika router mendukungnya. Rotasi key bila pernah terekspos.
- Untuk LXC, Docker-in-LXC membutuhkan konfigurasi host yang sesuai. Utamakan LXC unprivileged bila kompatibel; jangan mengaktifkan nesting/privileged tanpa kebutuhan dan tinjauan risiko.

## Troubleshooting

```bash
docker compose logs --tail=100 api
docker compose logs --tail=100 web
curl -sS http://127.0.0.1:8088/api/status | python3 -m json.tool
curl -sS http://127.0.0.1:8088/api/models | python3 -m json.tool
```

- `unconfigured`: env belum diisi atau endpoint Hermes belum disetel.
- `Router HTTP 401`: periksa key; jangan menaruh key di URL atau source code.
- `Router timeout`: cek DNS, TLS, route keluar, dan timeout.
- `model list belum tersedia`: periksa apakah endpoint `/v1/models` memang didukung dan mengembalikan format OpenAI `{ "data": [{"id":"..."}] }`.

## Pengembangan lokal

```bash
npm install
npm run dev
```

Untuk development UI yang memanggil proxy API, jalankan API server terpisah dan tambahkan Vite proxy sesuai kebutuhan. Build produksi disediakan lewat Docker Compose.
# hermes-agent-3d
