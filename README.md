# Annotation Activity Console

A Next.js (App Router) + React 18 + TypeScript frontend for managing annotation tasks with real-time updates.

## Quick Start

### 1. Start the Mock Server

```bash
cd mock-server
npm install
npm run mock
```

The mock server runs on http://localhost:4000 with a WebSocket endpoint at ws://localhost:4000/ws.

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs on http://localhost:3000.

### 3. Run Tests

```bash
cd frontend
npm test
```

### 4. Type Check

```bash
cd frontend
npx tsc --noEmit
```

## Architecture

```
take-home/
├── mock-server/           # Express + WebSocket mock backend
│   ├── package.json
│   └── server.js
├── frontend/              # Next.js App Router frontend
│   ├── src/
│   │   ├── domain/        # Types + normalization (types.ts, normalize.ts)
│   │   ├── store/         # Redux Toolkit store (store.ts, tasksSlice.ts)
│   │   ├── hooks/         # Custom hooks (useTaskFeed.ts, useAppStore.ts)
│   │   ├── components/    # React components (Console, TaskTable, TaskDetail, TaskSummary, etc.)
│   │   ├── lib/           # Utilities (cache.ts, providers.tsx)
│   │   └── app/           # Next.js App Router pages
│   ├── __tests__/         # Jest + RTL tests
│   ├── buggy/             # Original buggy TaskTicker + fixed version
│   └── jest.config.js
├── DECISIONS.md           # Architecture decisions and rationale
└── README.md              # This file
```

## Key Features

- **Normalized task data** with type/status discrimination and coercion for messy API data
- **Redux Toolkit** with `createEntityAdapter` for efficient entity management
- **Real-time WebSocket** feed with exponential backoff reconnection
- **Server-Sent Events** for streaming AI summaries with XSS sanitization
- **IndexedDB caching** with stale-while-revalidate pattern
- **Filterable/sortable task table** with search, type filter, status filter, and pagination

## Test Coverage

- `normalize.test.ts` — 18 tests covering all messy data coercion cases
- `selectors.test.ts` — 6 tests covering Redux selectors and WS event handling
- `TaskTable.test.tsx` — 5 tests covering search, filter, and interaction

Total: 29 tests, all passing.
