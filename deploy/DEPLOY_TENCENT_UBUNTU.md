# Tencent Cloud Ubuntu Deployment

## 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo systemctl start docker
sudo systemctl enable docker
```

## 2. Clone the repository

```bash
git clone https://github.com/583914425-dotcom/image-data-hub.git /opt/medical-portal
cd /opt/medical-portal/deploy
```

## 3. Create the environment file

```bash
cp .env.example .env
nano .env
```

Recommended values:

```env
DB_PASSWORD=your-strong-password
SESSION_SECRET=replace-with-a-long-random-string
WEB_PORT=80
```

## 4. Start the services

```bash
docker compose up -d --build
```

The app container will wait for PostgreSQL, push the schema, then start the web app.

## 5. Open the firewall

In Tencent Cloud, open inbound TCP port `80`.

## 6. Optional manual schema init

If you want to initialize PostgreSQL manually instead of relying on the app startup:

```bash
docker compose up -d db
docker exec -i medical_db psql -U medical_user -d medical_portal < init.sql
docker compose up -d --build
```
