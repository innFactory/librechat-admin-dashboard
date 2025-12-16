# AI Metrics Dashboard

[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.x-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/innFactory/librechat-admin-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/innFactory/librechat-admin-dashboard/actions/workflows/ci.yml)
[![CodeQL](https://github.com/innFactory/librechat-admin-dashboard/actions/workflows/codeql.yml/badge.svg)](https://github.com/innFactory/librechat-admin-dashboard/actions/workflows/codeql.yml)

A cloud-native dashboard for monitoring and analyzing [LibreChat](https://github.com/danny-avila/LibreChat) AI usage metrics, token consumption, and agent statistics.

## Features

- 📊 **Real-time Metrics**: Monitor active users, token usage, and request statistics
- 🤖 **Agent Analytics**: Track AI agent usage and performance
- 📈 **Interactive Charts**: Visualize data with MUI X Charts
- 🌙 **Dark/Light Mode**: System-aware theme switching
- 🔐 **Password Protection**: Secure dashboard access with HTTP-only cookies
- ☸️ **Kubernetes Ready**: Optimized for cloud-native deployments
- 🐳 **Docker Support**: Multi-stage build for minimal image size
- 🔒 **Security First**: OWASP best practices, automated scanning, and vulnerability detection

## Prerequisites

- Node.js >= 20.0.0
- MongoDB database (LibreChat database)
- Docker (for containerized deployment)

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Set environment variables
export MONGODB_URI="mongodb://localhost:27017"
export MONGODB_DB_NAME="librechat"
export DASHBOARD_PASSWORD="your-secure-password"

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker Deployment

```bash
# Build the image
./scripts/build.sh --repo your-registry --image ai-metrics-dashboard --tag v1.0.0

# Run with Docker
docker run -p 3000:3000 \
  -e MONGODB_URI="mongodb://your-mongo-host:27017" \
  -e MONGODB_DB_NAME="librechat" \
  -e DASHBOARD_PASSWORD="your-secure-password" \
  your-registry/ai-metrics-dashboard:v1.0.0
```

### Kubernetes Deployment

1. Create the secret:
```bash
kubectl create secret generic ai-metrics-dashboard-secret \
  --from-literal=MONGODB_URI='mongodb://...' \
  --from-literal=MONGODB_DB_NAME='librechat' \
  --from-literal=DASHBOARD_PASSWORD='your-secure-password' \
  --from-literal=SESSION_SECRET='your-32-char-random-secret'
```

2. Apply the manifests:
```bash
kubectl apply -f kubernetes.yaml
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `MONGODB_DB_NAME` | Yes | Database name (usually `librechat`) |
| `DASHBOARD_PASSWORD` | Yes | Password for dashboard access |
| `SESSION_SECRET` | No | Secret for session token signing (auto-generated if not set) |
| `NEXT_PUBLIC_BASE_PATH` | No | Base path when running behind a reverse proxy |
| `NEXT_PUBLIC_API_BACKEND_BASE_URL_NODE` | No | API base URL (default: `/api`) |

## Build Script

The `scripts/build.sh` script supports building and pushing Docker images:

```bash
./scripts/build.sh --repo <registry> --image <name> --tag <tag> [options]

Options:
  --repo       Docker registry URL (required)
  --image      Image name (required)
  --tag        Image tag (required)
  --base-url   Base URL for reverse proxy setups
  --push       Push to registry after building
  --platform   Target platform (default: linux/amd64)
```

Examples:
```bash
# Build for local testing
./scripts/build.sh --repo myregistry --image dashboard --tag dev

# Build and push for production
./scripts/build.sh --repo ghcr.io/myorg --image ai-metrics-dashboard --tag v1.0.0 --push

# Multi-platform build
./scripts/build.sh --repo docker.io/myorg --image dashboard --tag latest \
  --platform linux/amd64,linux/arm64 --push
```

## Security Features

- **HTTP-Only Cookies**: Session tokens are stored in HTTP-only cookies, preventing XSS attacks
- **HMAC Session Tokens**: Sessions are signed with HMAC-SHA256
- **Timing-Safe Comparisons**: Password and token verification use constant-time comparison
- **Security Headers**: HSTS, X-Content-Type-Options, X-Frame-Options, etc.
- **Non-Root Container**: Runs as unprivileged user in Docker/Kubernetes
- **Read-Only Filesystem**: Container filesystem is read-only (with tmpfs for cache)
- **Rate Limiting**: Ingress-level rate limiting in Kubernetes

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    AI Metrics Dashboard                       │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Next.js   │  │   React     │  │   MUI Components    │  │
│  │   App       │  │   Frontend  │  │   (Charts, Tables)  │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          │                                   │
│  ┌───────────────────────┴───────────────────────────────┐  │
│  │                    API Routes                          │  │
│  │  /api/auth/*  /api/health  /api/active-users  etc.    │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────┴───────────────────────────────┐  │
│  │                 MongoDB Queries                        │  │
│  │           (Aggregation Pipelines)                      │  │
│  └───────────────────────┬───────────────────────────────┘  │
└──────────────────────────┼───────────────────────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │    MongoDB      │
                  │  (LibreChat DB) │
                  └─────────────────┘
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check for Kubernetes probes |
| `/api/auth/login` | POST | Authenticate with password |
| `/api/auth/verify` | POST | Verify session token |
| `/api/auth/logout` | POST | Invalidate session |
| `/api/active-users` | GET | Active users count |
| `/api/all-agents` | GET | List all agents |
| `/api/all-user` | GET | Total user count |
| `/api/input-output-token` | GET | Token usage statistics |
| `/api/provider-with-model-usage` | GET | Model usage by provider |
| `/api/total-request-heat-map` | GET | Request heatmap data |

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Fix linting issues
npm run lint:fix

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage
```

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment:

### Continuous Integration (CI)

Runs on every push to `main`/`develop` branches and pull requests:

- **Linting**: Code style and quality checks with Biome
- **Type Checking**: TypeScript type validation
- **Testing**: Unit tests with coverage reporting
- **Building**: Application build verification
- **Security Scanning**: 
  - npm audit for dependency vulnerabilities
  - OWASP Dependency Check for CVE scanning
  - CodeQL for code security analysis

### Release Process

Automated releases are triggered by pushing version tags:

```bash
# Create and push a new release tag
git tag v1.0.0
git push origin v1.0.0
```

The release workflow automatically:

1. **Validates** the code (linting, type checking, tests, build)
2. **Builds** multi-platform Docker images (linux/amd64, linux/arm64)
3. **Scans** the Docker image with Trivy for vulnerabilities
4. **Pushes** images to GitHub Container Registry (ghcr.io)
5. **Creates** a GitHub release with changelog and deployment instructions

### Docker Images

Pre-built images are available at:
- `ghcr.io/innfactory/librechat-admin-dashboard:latest`
- `ghcr.io/innfactory/librechat-admin-dashboard:v1.0.0` (version tags)
- `ghcr.io/innfactory/librechat-admin-dashboard:1` (major version tags)
- `ghcr.io/innfactory/librechat-admin-dashboard:1.0` (major.minor version tags)

```bash
# Pull the latest image
docker pull ghcr.io/innfactory/librechat-admin-dashboard:latest

# Run the container
docker run -p 3000:3000 \
  -e MONGODB_URI="mongodb://your-mongo-host:27017" \
  -e MONGODB_DB_NAME="librechat" \
  -e DASHBOARD_PASSWORD="your-secure-password" \
  ghcr.io/innfactory/librechat-admin-dashboard:latest
```

## Security

### Security Best Practices

This dashboard implements multiple security layers:

#### Application Security
- **HTTP-Only Cookies**: Session tokens protected from XSS attacks
- **HMAC Session Tokens**: Cryptographically signed with SHA-256
- **Timing-Safe Comparisons**: Constant-time password verification
- **Security Headers**: HSTS, CSP, X-Frame-Options, X-Content-Type-Options

#### Container Security
- **Non-Root User**: Runs as unprivileged user (UID 1001)
- **Read-Only Filesystem**: Container filesystem is read-only
- **Minimal Base Image**: Alpine Linux for reduced attack surface
- **Multi-Stage Build**: No build tools in production image
- **Security Updates**: Automated Alpine package updates

#### Kubernetes Security
- **Security Context**: seccompProfile, runAsNonRoot, drop ALL capabilities
- **Network Policies**: Restrict ingress/egress traffic
- **Pod Disruption Budget**: Ensure high availability
- **Resource Limits**: CPU and memory constraints
- **Health Probes**: Liveness, readiness, and startup probes

### Vulnerability Scanning

Automated security scanning runs on:
- **Every PR and commit**: CodeQL analysis
- **Weekly**: Scheduled CodeQL scans
- **Every release**: Trivy container scanning
- **Every build**: npm audit and OWASP Dependency Check

### Known Vulnerabilities

⚠️ **xlsx (0.18.5)**: High severity vulnerabilities in SheetJS library
- **Issue**: Prototype pollution and ReDoS vulnerabilities
- **Status**: No fix available in current stable release
- **Mitigation**: Used only for export functionality; input validation applied
- **Tracking**: Monitoring for updates to v0.19.3+ or v0.20.2+

### Security Reporting

To report security vulnerabilities, please email security@innfactory.de or use GitHub Security Advisories.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit a pull request

All pull requests must pass:
- Linting checks
- Type checking
- Unit tests
- Security scans

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Related Projects

- [LibreChat](https://github.com/danny-avila/LibreChat) - The AI chat application this dashboard monitors
