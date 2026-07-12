# UK Energy Mix & EV Charging Optimizer — Backend

REST API that provides UK energy generation mix data and calculates optimal EV charging windows based on clean energy availability.

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **Validation**: Zod
- **Logging**: Pino
- **API Docs**: Swagger / OpenAPI
- **Testing**: Jest + Supertest

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and adjust as needed:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `development` | Environment |
| `CARBON_INTENSITY_API_URL` | `https://api.carbonintensity.org.uk` | External API URL |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed frontend origin |

### Running Locally

```bash
npm run dev
```

The server starts at `http://localhost:3001`.

### API Documentation

Swagger UI is available at `http://localhost:3001/api-docs`.

## API Endpoints

### `GET /api/energy-mix`

Returns the average energy generation mix for three days (today, tomorrow, day after tomorrow).

### `GET /api/optimal-charging?hours=N`

Finds the optimal EV charging window (1–6 hours) with the highest clean energy percentage across the next two forecast days.

**Query Parameters:**
- `hours` (required): Integer 1–6

### `GET /health`

Health check endpoint.

## Testing

```bash
npm test              # Run all tests
npm run test:coverage # Run with coverage report
```

## Building for Production

```bash
npm run build
npm start
```

## Docker

```bash
docker build -t energy-mix-backend .
docker run -p 3001:3001 energy-mix-backend
```

## Architecture

```
src/
├── config/          # Environment & constants
├── clients/         # External API communication
├── services/        # Business logic
├── controllers/     # Request/response handling
├── routes/          # Route definitions
├── middleware/       # Validation & error handling
├── types/           # TypeScript interfaces
└── utils/           # Helpers (logging, dates)
```

## Clean Energy Sources

For this application, the following are classified as clean energy:
- Biomass
- Nuclear
- Hydro
- Wind
- Solar

## License

MIT
