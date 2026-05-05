<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis" alt="Redis" />
  <img src="https://img.shields.io/badge/Haraka-MTA-orange?style=for-the-badge" alt="Haraka" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker" alt="Docker" />
</p>

# 📬 MaiLoL — Self-Hosted Disposable Email Service

**MaiLoL** is a free, open-source, self-hosted temporary/disposable email service. It allows anyone to create throwaway email addresses instantly — no registration required — to protect their real inbox from spam, phishing, and unwanted sign-ups.

> **Inspiration:** This project is heavily inspired by [mail.tm](https://mail.tm), an excellent disposable email service. MaiLoL aims to provide a similar experience as a fully self-hosted, open-source alternative that you can deploy on your own infrastructure with your own custom domain.

---

## ✨ Features

### Core
- 🔒 **Instant Account Creation** — Create a temporary email with a username + password in seconds
- 📥 **Real-Time Inbox** — Receive emails in real-time via Server-Sent Events (SSE)
- 📎 **Attachment Support** — View and download email attachments (PDF, images, etc.)
- 🔐 **JWT Authentication** — Stateless, secure token-based authentication
- 🗑️ **Message Management** — Read, view, and delete individual messages
- 👥 **Multi-Account Switching** — Manage multiple email accounts from a single browser session
- 🔔 **Unread Indicators** — Visual dot badges for accounts/messages with unread emails

### User Experience
- 🌗 **Dark/Light Theme** — Toggle between themes with persistence across sessions
- 📋 **One-Click Copy** — Click to copy your email address to clipboard
- 🎨 **Modern UI** — Glassmorphism, smooth animations (Framer Motion), responsive design
- 🔑 **Password Reveal** — Blur-masked password display with click-to-reveal
- 📊 **Storage Quota** — Visual progress bar showing inbox usage

### Infrastructure
- 🐳 **Fully Dockerized** — One-command deployment with `docker compose up`
- 📨 **Built-in MTA** — Haraka SMTP server for receiving inbound emails
- ⚡ **Redis-Powered** — All data stored in Redis with automatic TTL expiration
- 🚀 **Standalone Build** — Optimized Next.js standalone output for minimal Docker images

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                             │
└──────────┬──────────────────────────────────┬───────────────┘
           │ SMTP (Port 25)                   │ HTTPS (Port 443)
           ▼                                  ▼
┌─────────────────────┐           ┌─────────────────────────┐
│   mailol-mta        │           │   Reverse Proxy         │
│   (Haraka MTA)      │           │   (Nginx / Caddy)       │
│                     │           │                         │
│   Receives inbound  │           │   TLS termination       │
│   emails via SMTP   │           │   → localhost:3000      │
└──────────┬──────────┘           └───────────┬─────────────┘
           │                                  │
           │  Parse & Store                   │  HTTP
           ▼                                  ▼
┌─────────────────────┐           ┌─────────────────────────┐
│   mailol-redis      │◄──────────│   mailol-app            │
│   (Redis 7)         │           │   (Next.js 16)          │
│                     │           │                         │
│   • User accounts   │  Pub/Sub  │   • REST API            │
│   • Messages (JSON) │──────────►│   • SSE real-time       │
│   • Attachments     │           │   • React frontend      │
│   • Inbox indices   │           │   • JWT auth            │
└─────────────────────┘           └─────────────────────────┘
```

---

## 📁 Project Structure

```
mailol/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── accounts/       # POST /api/accounts — Create account
│   │   │   │   └── [id]/       # DELETE /api/accounts/:id — Delete account
│   │   │   ├── token/          # POST /api/token — Login (get JWT)
│   │   │   ├── me/             # GET /api/me — Current user info
│   │   │   ├── messages/       # GET /api/messages — List inbox
│   │   │   │   └── [id]/       # GET/DELETE /api/messages/:id
│   │   │   │       └── attachments/
│   │   │   │           └── [index]/ # GET — Download attachment
│   │   │   ├── domains/        # GET /api/domains — Available domains
│   │   │   ├── events/         # GET /api/events — SSE stream
│   │   │   └── dev/
│   │   │       └── mock/       # GET /api/dev/mock — Dev: inject test email
│   │   ├── globals.css         # Tailwind + custom design tokens
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Main page (landing / inbox / viewer)
│   │
│   ├── components/
│   │   ├── auth/               # CreateAccountModal, LoginModal, DeleteAccountModal
│   │   ├── layout/             # AppLayout, Sidebar, TopBar
│   │   ├── mail/               # EmailList, EmailViewer
│   │   └── ui/                 # Modal (reusable)
│   │
│   ├── lib/
│   │   ├── auth.ts             # JWT verification middleware
│   │   ├── jwt.ts              # JWT sign/verify helpers
│   │   └── redis.ts            # Redis client (ioredis) singleton
│   │
│   └── store/
│       └── useMailStore.ts     # Zustand global state management
│
├── haraka_plugin/
│   └── mailol_processor.js     # Haraka plugin: parse & store inbound email
│
├── Dockerfile                  # Multi-stage Next.js production build
├── Dockerfile.haraka           # Haraka MTA container
├── docker-compose.yml          # Full stack orchestration
├── .env.example                # Environment variable template
└── .env.production             # Production environment template
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+ (for local development)
- [Docker](https://www.docker.com/) & Docker Compose (for deployment)
- A domain with **MX record** pointing to your server (for receiving real emails)

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/thelolna15/mailol.git
cd mailol/project

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env — set your REDIS_URL to a running Redis instance

# 4. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Testing Email Reception (Dev Mode)

Since you likely don't have a local SMTP server during development, use the built-in mock endpoint:

```bash
# Inject a test email into any account
curl "http://localhost:3000/api/dev/mock?address=yourname@xneine.site"
```

This will create a fake email with HTML content and a PDF attachment in the specified inbox.

---

## 🐳 Docker Deployment (Production)

### 1. Prepare Environment

```bash
cp .env.production .env
nano .env
```

**⚠️ IMPORTANT:** Generate a secure `JWT_SECRET` before deploying:

```bash
openssl rand -hex 32
```

### 2. Build & Run

```bash
docker compose up -d --build
```

This spins up three containers:

| Container | Port | Description |
|---|---|---|
| `mailol-app` | 3000 | Next.js web app & API |
| `mailol-redis` | — | Redis data store (internal only) |
| `mailol-mta` | 25 | Haraka SMTP server |

### 3. DNS Configuration

For your domain (e.g., `xneine.site`), configure these DNS records:

| Type | Name | Value | Priority |
|---|---|---|---|
| A | `@` | `YOUR_SERVER_IP` | — |
| A | `mail` | `YOUR_SERVER_IP` | — |
| MX | `@` | `mail.xneine.site` | 10 |

### 4. Reverse Proxy (HTTPS)

Place Nginx or Caddy in front of port 3000 for TLS termination:

<details>
<summary><strong>Caddy (recommended — automatic HTTPS)</strong></summary>

```
xneine.site {
    reverse_proxy localhost:3000
}
```

</details>

<details>
<summary><strong>Nginx</strong></summary>

```nginx
server {
    listen 443 ssl http2;
    server_name xneine.site;

    ssl_certificate /etc/letsencrypt/live/xneine.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/xneine.site/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

</details>

### 5. Verify

```bash
# Check all containers are running
docker compose ps

# View logs
docker compose logs -f app
docker compose logs -f mta

# Test SMTP connectivity
telnet YOUR_SERVER_IP 25
```

---

## 🔌 API Reference

All endpoints (except `/api/accounts` POST and `/api/token` POST) require a `Bearer` token in the `Authorization` header.

### Authentication

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/accounts` | Create a new account | ❌ |
| `POST` | `/api/token` | Login & get JWT token | ❌ |

#### Create Account

```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{"address": "myname@xneine.site", "password": "mypassword"}'
```

#### Login

```bash
curl -X POST http://localhost:3000/api/token \
  -H "Content-Type: application/json" \
  -d '{"address": "myname@xneine.site", "password": "mypassword"}'
```

### Resources

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/me` | Get current account info | ✅ |
| `GET` | `/api/messages` | List inbox messages | ✅ |
| `GET` | `/api/messages/:id` | Get single message with HTML body | ✅ |
| `DELETE` | `/api/messages/:id` | Delete a message | ✅ |
| `GET` | `/api/messages/:id/attachments/:index` | Download attachment | ✅ |
| `DELETE` | `/api/accounts/:id` | Delete account & all data | ✅ |
| `GET` | `/api/domains` | List available domains | ❌ |
| `GET` | `/api/events?authorization=TOKEN` | SSE real-time stream | ✅ (query) |

---

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DOMAIN` | ✅ | `xneine.site` | Email domain for account creation |
| `NEXT_PUBLIC_DOMAIN` | ✅ | `xneine.site` | Domain shown in the frontend UI |
| `REDIS_URL` | ✅ | `redis://localhost:6379` | Redis connection string |
| `JWT_SECRET` | ✅ | — | Secret key for signing JWT tokens |
| `JWT_EXPIRY` | ❌ | `3600` | Token expiration time in seconds |
| `DEFAULT_QUOTA` | ❌ | `41943040` | Max inbox storage per account (bytes) |

---

## 🛡️ Security Considerations

- **Always change `JWT_SECRET`** in production — use `openssl rand -hex 32`
- **Never expose Redis** to the public internet — it runs on an internal Docker network
- **Use HTTPS** in production — configure a reverse proxy with TLS
- **Rate limiting** is not yet implemented — consider adding Nginx rate limits
- **Email content** is sanitized with DOMPurify before rendering
- **Passwords** are hashed with bcrypt before storage

---

## 🗺️ Roadmap

- [ ] Rate limiting middleware
- [ ] DKIM / SPF / DMARC configuration guide
- [ ] Outbound email support (compose & send)
- [ ] Custom domain support (multi-domain)
- [ ] Admin dashboard
- [ ] Webhook notifications
- [ ] S3-compatible attachment storage
- [ ] Account expiration policies

---

## 🙏 Credits & Acknowledgments

- **[mail.tm](https://mail.tm)** — The primary inspiration for this project. MaiLoL's API design, account model, and user experience are heavily influenced by mail.tm's elegant approach to disposable email.
- **[Haraka](https://haraka.github.io/)** — High-performance Node.js SMTP server used as the Mail Transfer Agent.
- **[Next.js](https://nextjs.org/)** — React framework powering both the frontend and API.
- **[Redis](https://redis.io/)** — In-memory data store for lightning-fast message retrieval.
- **[Zustand](https://github.com/pmndrs/zustand)** — Lightweight state management for React.
- **[Framer Motion](https://www.framer.com/motion/)** — Animation library for smooth UI transitions.
- **[Tailwind CSS](https://tailwindcss.com/)** — Utility-first CSS framework for the design system.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ as an open-source alternative to commercial disposable email services.
</p>
