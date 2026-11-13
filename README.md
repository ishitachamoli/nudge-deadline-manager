# Nudge - Reliable Deadline Scheduling and Notification System

A college project demonstrating a full-stack application for managing reminders and notifications with reliable scheduling, MongoDB persistence, and a responsive UI.

## Features

- Create, view, edit, reschedule, and delete reminders
- Simulated notification delivery with detailed logs
- Persistent storage using MongoDB
- Idempotent notification handling and retry logic
- Loading, success, empty, and error UI states

## Tech Stack

- **Frontend:** React + Vite
- **Styling:** Tailwind CSS (optional)
- **Backend:** Node.js + Express
- **Database:** MongoDB + Mongoose
- **Scheduling:** Persistent job scheduling (cron-like)

## Getting Started

1. Clone the repository
2. Install dependencies (see `npm run install`)
3. Copy `.env.example` to `.env` and fill in the required values
4. Run the development server:

```bash
npm run dev
```

5. Open http://localhost:5173 (Vite) for the frontend and http://localhost:3000 (Express) for the backend.

## License

MIT