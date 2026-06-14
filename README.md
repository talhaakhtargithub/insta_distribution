# InstaDistro — Instagram Swarm Distribution

An MVP for managing many Instagram accounts from a single mobile app. It pairs a React Native (Expo) client with a Node.js + TypeScript backend to distribute content across accounts, with automated warmup, scheduling, health monitoring, and proxy management.

## What it does

- **Multi-account management** — connect and manage 100+ Instagram accounts from one dashboard
- **Content distribution** — push videos/posts out across account groups, with a content-variation engine so each account posts a unique variant
- **Account warmup** — automated warmup protocols to age and stabilize new accounts before posting
- **Advanced scheduling** — queue and time posts, backed by Bull job queues on Redis
- **Health monitoring** — track per-account health and surface issues in a dedicated screen
- **Proxy management** — assign and rotate proxies per account
- **In-app video editor** — pick, preview, and apply effects to videos before distribution (Expo AV + FFmpeg processing on the backend)
- **Onboarding & theming** — splash/onboarding flow and light/dark theming in the mobile app
- **Documented API** — Swagger/OpenAPI docs, OAuth, rate limiting, and a tested Express API

> Architecture: React Native (Expo) app → REST API → Node.js/Express backend → PostgreSQL (data) + Redis (cache/queues).

## Tech Stack

![React Native](https://img.shields.io/badge/React_Native-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

## Usage

### Backend API

```bash
cd InstaDistro-Backend
npm install
cp .env.example .env        # fill in your own config (no secrets committed)

# Start PostgreSQL + Redis (Docker)
docker compose up -d

npm run migrate             # set up the database schema
npm run dev                 # start the API in watch mode
npm run worker              # start the background job worker
```

### Mobile App

```bash
cd InstaDistro
npm install
npm start                   # Expo dev server (then: a = Android, i = iOS, w = web)
```

> For convenience, `START_ALL.sh` boots the full stack locally. This tool is an MVP for educational/internal use — automate within Instagram's terms of service.

---

Built by [Talha Akhtar](https://www.linkedin.com/in/ceotalha) · AI & Automation Specialist
