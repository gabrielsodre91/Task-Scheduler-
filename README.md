# Distributed Task Scheduler

A distributed task scheduling system that allows users to schedule both one-time and recurring tasks, ensuring they are executed within 10 seconds of their scheduled time.

## Features

- Create one-time tasks with specific execution time
- Create recurring tasks using Cron syntax
- View scheduled tasks
- View executed tasks history
- Edit existing tasks
- Delete tasks

## Technologies Used

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite
- **Containerization**: Docker

## Requirements

- Docker and Docker Compose
- Node.js 14+ (for local development)
- npm or yarn (for local development)

## Running with Docker

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/task-scheduler.git
   cd task-scheduler
   ```

2. Start containers with Docker Compose:
   ```bash
   docker compose up
   ```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3003

## Local Development

### Backend (server)

1. Navigate to server folder:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

### Frontend (client)

1. Navigate to client folder:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start React app:
   ```bash
   npm start
   ```

## Project Structure

```
task-scheduler/
├── client/                 # React Frontend
│   ├── public/            # Public files
│   ├── src/               # Source code
│   │   ├── components/    # React components
│   │   ├── services/      # API services
│   │   ├── types/         # Type definitions
│   │   └── App.tsx        # Main component
│   ├── Dockerfile         # Client Docker config
│   └── package.json       # Client dependencies
├── server/                # Node.js Backend
│   ├── src/               # Source code
│   │   ├── db/            # Database config
│   │   ├── models/        # Data models
│   │   ├── services/      # Business services
│   │   ├── utils/         # Utilities
│   │   └── index.ts       # Server entry point
│   ├── Dockerfile         # Server Docker config
│   └── package.json       # Server dependencies
├── docker-compose.yml     # Docker Compose config
└── README.md              # Project documentation
```

## Using the Application

### Creating a One-time Task

1. Access the home page
2. Fill in task title and description
3. Select "One-time" type
4. Choose execution date and time
5. Click "Create Task"

### Creating a Recurring Task

1. Access the home page
2. Fill in task title and description
3. Select "Recurring" type
4. Enter a valid Cron expression (e.g., "*/5 * * * *" for every 5 minutes)
5. Click "Create Task"

### Cron Expressions

Cron expressions follow the standard format:

┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * *

Examples:
- `* * * * *`: Every minute
- `0 * * * *`: Every hour
- `0 0 * * *`: Once a day at midnight
- `0 0 * * 0`: Once a week on Sunday
- `0 0 1 * *`: Once a month on the first day

## License

This project is licensed under the MIT License - see the LICENSE file for details 
