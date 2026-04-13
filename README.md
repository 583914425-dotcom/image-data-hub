# Image Data Hub

Medical imaging research portal for cervical cancer clinical data, imaging records, statistics, and radiomics.

## Tencent Cloud Ubuntu Quick Deploy

This repository now supports standalone deployment outside Replit.

### 1. Install Docker on the server

```bash
curl -fsSL https://get.docker.com | sh
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. Clone the repository

```bash
git clone <your-github-repo> /opt/medical-portal
cd /opt/medical-portal/deploy
```

### 3. Create `.env`

```bash
cp .env.example .env
nano .env
```

Example:

```env
DB_PASSWORD=change-this-password
SESSION_SECRET=change-this-to-a-long-random-string
WEB_PORT=80
```

### 4. Start

```bash
docker compose up -d --build
```

Open Tencent Cloud inbound TCP port `80`.

## Deployment Notes

- The backend now supports local object storage when not running on Replit.
- Uploaded files are stored in the Docker volume mounted at `/app/data/object-storage`.
- PostgreSQL schema is applied automatically on app startup.
- The Express server now serves the built frontend directly.

Detailed deployment notes are in `deploy/DEPLOY_TENCENT_UBUNTU.md`.
