# MOVIC - Personal Social Video Downloader

A private single-user web application for authorized social media video inspection, resolution selection, and compliant local storage built in accordance with **Software Requirements Document (SRD v1.0)**.

---

## 🚀 Key Features

- **Next.js App Router & TypeScript**: Fast, type-safe architecture with Route Handlers.
- **Strict SSRF Defenses**: Destination DNS resolution and IP verification to block loopback (`127.0.0.0/8`), private networks (`10/8`, `172.16/12`, `192.168/16`), and cloud metadata APIs (`169.254.169.254`).
- **Rights & Compliance Gate**: Mandatory affirmative rights confirmation requirement before any download job can be initiated.
- **Provider Capability Registry**: Central registry exposing supported providers (Direct Authorized Media, YouTube, TikTok, Vimeo) with explicit distinction between metadata-only and authorized download paths.
- **Persistent SQLite Job Engine**: Background queue engine using Node.js built-in `node:sqlite`, enforcing concurrency limits (`MAX_CONCURRENT_JOBS = 1`), execution timeouts, and automatic file retention cleanup.
- **Safe File Delivery & Sanitization**: Filename sanitization, path traversal defense, and streaming responses with safe `Content-Disposition` headers.
- **Modern UI**: Dark-mode interface with glassmorphism, fluid typography, visible focus rings, live status polling, and keyboard accessibility.

---

## 🛠️ Architecture & API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/sources/inspect` | Validates URL, performs SSRF check, executes provider inspection. |
| `POST` | `/api/v1/download-jobs` | Creates a download job for a selected variant after rights confirmation. |
| `GET` | `/api/v1/download-jobs` | Lists bounded job history. |
| `GET` | `/api/v1/download-jobs/:jobId` | Reads current job state, progress, and expiry timestamp. |
| `GET` | `/api/v1/download-jobs/:jobId/file` | Streams the downloaded file with safe content headers. |
| `DELETE` | `/api/v1/download-jobs/:jobId` | Cancels an active job or clears job record and deletes local files. |
| `GET` | `/api/v1/platforms/capabilities` | Returns active provider registry and capability flags. |
| `GET` | `/api/v1/health` | Health check endpoint reporting worker readiness. |
| `GET / PUT` | `/api/v1/settings` | Manages retention window, file size limits, and provider toggles. |

---

## 📦 Getting Started

### Prerequisites
- Node.js 20+ (Node.js 22+ recommended for built-in `node:sqlite`)
- npm

### Installation
```bash
git clone https://github.com/adeel-151/Movic.git
cd Movic
npm install
```

### Running Locally
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📄 License & Compliance Notice
This project is intended strictly for personal, private use on localhost. It does not circumvent DRM, encryption, access controls, private account restrictions, or platform terms of service.
