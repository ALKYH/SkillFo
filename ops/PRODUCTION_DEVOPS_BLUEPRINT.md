# SkillFo Production DevOps Blueprint

This blueprint is designed for the current two-repo setup:
- Frontend repo: `SkillFo` (Vite + React)
- Backend repo: `SkillFo_backend` (Node.js + Express + PostgreSQL)

The goal is a production setup that is stable, observable, and simple to operate.

## 1) Recommended Component Stack

| Area | Recommended Component | Why |
| --- | --- | --- |
| Source control | GitHub | Already aligned with current repos |
| CI | GitHub Actions | Native integration, low setup cost |
| Container registry | GHCR | Tight integration with GitHub Actions |
| Runtime (MVP) | Docker Compose on Linux VM | Fastest path to production with low ops overhead |
| Edge gateway / TLS | Caddy | Automatic HTTPS and simple reverse proxy |
| Frontend serving | Nginx container | High-performance static hosting + `/api` proxy |
| Backend runtime | Node.js container | Matches current backend implementation |
| Database | PostgreSQL 16 (managed preferred) | Reliable, mature, production standard |
| Secrets | GitHub Encrypted Secrets + runtime `.env` on host | Easy and practical for small teams |
| Observability | Sentry + Prometheus + Grafana + Loki | Error tracking, metrics, dashboards, log search |
| Uptime checks | Uptime Kuma or cloud uptime monitor | Fast incident detection |
| Alerting | Grafana Alerts + Slack/Feishu webhook | Actionable production alerts |
| Backups | Daily `pg_dump` + retention policy | Basic disaster recovery baseline |

## 2) Target Topology (MVP)

```text
Internet
  -> Caddy (TLS, domain routing)
      -> frontend (nginx, static files)
          -> /api -> backend (node/express)
              -> postgres
```

## 3) CI/CD Design

Use one pipeline per repo:

1. Frontend repo (`SkillFo`)
   - Install deps
   - Build Vite app
   - Build Docker image
   - Push image to GHCR

2. Backend repo (`SkillFo_backend`)
   - Install deps
   - Run migration checks and smoke checks
   - Build Docker image
   - Push image to GHCR

3. Deploy strategy
   - Pull latest images on production host
   - `docker compose -f ops/docker-compose.prod.yml up -d`
   - Run backend migration job before switching traffic

## 4) Environment Baseline

Frontend production env:
- Keep `VITE_USER_API_BASE_URL` empty
- Keep `VITE_FORGE_API_BASE_URL` empty
- Use same-origin `/api` through reverse proxy

Backend production env:
- Set strong `ACCESS_TOKEN_SECRET` (>=32 chars random)
- Use managed PostgreSQL in production if possible
- Set `NODE_ENV=production`
- Restrict `CORS_ORIGINS` to real domain(s)

## 5) Security Baseline

1. HTTPS only, redirect HTTP to HTTPS at Caddy.
2. Do not store production secrets in git.
3. Rotate JWT secret and DB password on schedule.
4. Restrict backend CORS to known frontend domains.
5. Add DB network restrictions (allowlist private host/network only).
6. Add image vulnerability scan in CI (Trivy or GH Advanced Security).

## 6) Observability Baseline

Minimum first:
- Sentry for frontend and backend exceptions.
- `/api/health` check from uptime monitor.

Then add:
- Prometheus scraping backend metrics endpoint.
- Grafana dashboards for latency, error rate, and saturation.
- Loki for backend logs and query during incidents.

## 7) Release and Rollback

1. Use immutable image tags (`sha-<commit>`).
2. Keep `current` and `previous` compose versions.
3. Roll forward by pulling new image and `up -d`.
4. Rollback by restoring previous image tag and `up -d`.

## 8) Immediate Action List

1. Put backend Dockerfile and backend workflow template into `SkillFo_backend`.
2. Configure GHCR push permissions in both repos.
3. Provision production VM and DNS.
4. Create production `.env` files from templates in `ops/env`.
5. Deploy using `ops/docker-compose.prod.yml`.
6. Verify:
   - frontend loads
   - `/api/health` is healthy
   - login and register work
7. Add Sentry DSNs and alert channels.

