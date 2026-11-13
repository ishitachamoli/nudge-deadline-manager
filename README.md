 <div align="center">

# NUDGE

### Never miss what matters.

**A smarter way to manage life's deadlines.**

A reliable, full-stack reminder and deadline scheduling system designed to help you stay ahead of important dates, never overlook a responsibility, and keep everything on track.

<br />

![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-black?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)

<br />

[Features](#-features) • [Tech Stack](#-tech-stack) • [Architecture](#-architecture) • [Getting Started](#-getting-started)

</div>

---

## ✨ About Nudge

Life gets busy. Important deadlines can easily slip through the cracks — whether it's a document renewal, an insurance expiry, a certification, or another time-sensitive responsibility.

**Nudge** is built to solve that problem.

It is a full-stack deadline management application that lets users create, organize, track, and reschedule reminders while a dedicated scheduling system handles due notifications.

The goal is simple: **make remembering important things effortless.**

## 🚀 Features

| Feature | Description |
|---|---|
| 📅 Reminder Management | Create, view, edit, reschedule, and delete reminders |
| 🔔 Notification System | Simulated notification delivery with detailed logs |
| ⏱️ Automated Scheduling | Background worker processes reminders when they become due |
| 🔁 Retry Mechanism | Failed notification attempts are retried using exponential backoff |
| 🛡️ Duplicate Prevention | Idempotency keys help prevent duplicate notification delivery |
| 💾 Data Persistence | MongoDB-backed storage for reminders and notification records |
| ⚡ API Validation | Structured request validation using Zod |
| 🎨 Responsive Interface | A clean interface with loading, success, empty, and error states |

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, Vite 5, JavaScript |
| Styling | CSS3 |
| Backend | Node.js, Express 4 |
| Database | MongoDB, Mongoose 8 |
| Validation | Zod |
| Scheduling | Independent background worker |
| Testing | Jest, Supertest, mongodb-memory-server |
| Architecture | npm Workspaces Monorepo |

## 🏗️ Architecture

Nudge follows a modular monorepo structure, separating the frontend, backend, shared contracts, and scheduling worker.

```text
Nudge/
│
├── client/          # React + Vite frontend
│
├── server/          # Express backend and REST APIs
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── services/
│   └── __tests__/
│
├── scheduler/       # Background scheduling worker
│   └── src/
│       ├── jobs/
│       ├── services/
│       └── workers/
│
├── shared/          # Shared contracts, schemas and constants
│
├── docs/            # Architecture and contribution guides
│
├── start-dev.js     # Shared development environment
└── package.json
```

### How it works

1. Users create and manage reminders through the React frontend.
2. The Express backend validates requests and manages reminder data.
3. MongoDB stores reminders and notification records.
4. The independent scheduler checks for due reminders.
5. Notifications are processed, logged, and retried when delivery fails.

## ⚙️ Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
cd YOUR-REPOSITORY
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the backend and scheduler

Open your first terminal:

```bash
npm run dev:shared
```

This starts the backend and scheduler using a shared development MongoDB instance.

### 4. Start the frontend

Open a second terminal:

```bash
npm run dev --workspace client
```

### 5. Open the application

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3000 |
| Health Check | http://localhost:3000/health |

> **Note:** The shared development setup uses an in-memory MongoDB instance. Data is not retained after the development environment shuts down. For persistent database storage, configure a MongoDB connection using the environment variables in `.env.example`.

## 🧪 Testing

Run the backend test suite:

```bash
npm test --workspace server
```

The backend test suite uses Jest and mongodb-memory-server for isolated testing.

## 🔮 Future Scope

- Real notification delivery through email and push services.
- User authentication and personalized dashboards.
- Advanced reminder categorization and filtering.
- Recurring reminders and flexible scheduling.
- Analytics for upcoming and completed deadlines.

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

### A little nudge can make a big difference.

**Nudge — Never miss what matters.**

</div>