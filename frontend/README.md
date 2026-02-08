# EtherScope Frontend

A sophisticated web interface for debugging and analyzing Ethereum transactions.

## Features

- **Transaction Analysis**: Submit smart contracts for security analysis using Slither and Mythril
- **Vulnerability Findings**: View detailed security findings categorized by severity
- **Gas Profiling**: Analyze gas consumption trends and optimize contract performance
- **Real-time Monitoring**: Subscribe to contracts and receive alerts for suspicious activity
- **Transaction Traces**: Visualize execution flow with detailed call trees

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React Query** - Data fetching and state management
- **Recharts** - Data visualization
- **WebSocket** - Real-time updates

## Getting Started

### Prerequisites

- Node.js 18+
- Backend server running on http://localhost:4000

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   ├── providers.tsx      # React Query provider
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── analyzer/          # Analysis submission
│   │   ├── findings/          # Vulnerability display
│   │   ├── trends/            # Gas profiling charts
│   │   ├── monitor/           # Real-time monitoring
│   │   ├── trace/             # Call trace visualization
│   │   └── ui/                # Reusable UI components
│   ├── hooks/                 # Custom React hooks
│   │   └── useWebSocket.ts    # WebSocket hook
│   └── lib/                   # Utilities
│       ├── api/
│       │   └── client.ts      # API & WebSocket client
│       ├── types.ts           # TypeScript types
│       └── utils.ts           # Helper functions
├── package.json
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

## API Integration

The frontend communicates with the backend via:

### REST Endpoints

- `POST /analyze` - Submit analysis job
- `GET /tx/:hash/report` - Get analysis report
- `GET /trends?contract=ADDRESS` - Get gas trends
- `POST /monitor/subscribe` - Subscribe to contract monitoring
- `POST /monitor/unsubscribe` - Unsubscribe from monitoring
- `GET /monitor/list` - List monitored contracts

### WebSocket Events

- `job:update` - Analysis progress updates
- `job:done` - Analysis completion
- `monitor:alert` - Contract monitoring alerts

## Development

### Adding New Components

Components follow the feature-based organization pattern:

```tsx
// src/components/feature/Component.tsx
"use client"; // For client components

export default function Component() {
  // Component logic
}
```

### Styling

Using Tailwind CSS with custom design tokens defined in `globals.css`:

```tsx
<div className="bg-background text-foreground border rounded-lg p-4">
  Content
</div>
```

### API Calls

Use the centralized API client:

```tsx
import { apiClient } from "@/lib/api/client";

const response = await apiClient.analyze({
  projectRoot: "/path/to/project",
  tools: ["slither"],
});
```

## Contributing

1. Follow the existing code structure and patterns
2. Use TypeScript strictly
3. Keep components focused and reusable
4. Add proper error handling
5. Test with the backend running

## License

Part of the EtherScope monorepo project.
