# LibreChat Admin Dashboard

[![CI](https://github.com/innFactory/librechat-admin-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/innFactory/librechat-admin-dashboard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A dashboard for monitoring [LibreChat](https://github.com/danny-avila/LibreChat) usage metrics, token consumption, and agent statistics.

![Dashboard Screenshot](docs/screenshot.png)

## Features

- 📊 Real-time metrics (active users, tokens, requests)
- 🤖 Agent and model analytics
- 📈 Interactive charts with MUI X Charts
- 🌙 Dark/Light mode
- 🔐 Password protection
- 🐳 Docker ready

## Quick Start

### Prerequisites

- Node.js >= 20
- MongoDB (LibreChat database)

### Development

```bash
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your MongoDB URI and password

npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Docker

```bash
docker build -t librechat-dashboard .

docker run -p 3000:3000 \
  -e MONGODB_URI="mongodb://host:27017" \
  -e MONGODB_DB_NAME="librechat" \
  -e DASHBOARD_PASSWORD="your-password" \
  librechat-dashboard
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `MONGODB_DB_NAME` | Yes | Database name (usually `librechat`) |
| `DASHBOARD_PASSWORD` | Yes | Dashboard login password |
| `SESSION_SECRET` | No | Session signing secret (auto-generated) |
| `NEXT_PUBLIC_BASE_PATH` | No | Base path for reverse proxy (e.g., `/dashboard`) |

## Reverse Proxy

To deploy under a sub-path (e.g., `/dashboard`):

```bash
docker build --build-arg NEXT_PUBLIC_BASE_PATH=/dashboard -t librechat-dashboard .
```

> **Note**: `NEXT_PUBLIC_BASE_PATH` is baked into the build. Rebuild when changing.

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run linter
npm run type-check   # TypeScript check
npm test             # Run tests
```

## License

MIT - see [LICENSE](LICENSE)

## Credits

Developed by [innFactory GmbH](https://innfactory.de) & [innFactory AI Consulting GmbH](https://innfactory.ai)

For managed LibreChat hosting with EU GDPR compliance, visit [CompanyGPT](https://company-gpt.com)
