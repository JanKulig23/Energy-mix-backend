import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import energyRoutes from "./routes/energy.routes";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./utils/logger";

const app = express();

// Security and parsing
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin,
    methods: ["GET"],
  }),
);
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

// Request logging
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, "Incoming request");
  next();
});

// Swagger / OpenAPI docs
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "UK Energy Mix & EV Charging Optimizer API",
      version: "1.0.0",
      description:
        "Backend API that provides UK energy generation mix data and calculates " +
        "optimal EV charging windows based on clean energy availability.",
    },
    servers: [
      {
        url: "/",
        description: "Current server",
      },
    ],
  },
  apis: ["./src/routes/*.ts"],
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes 
app.use("/api", energyRoutes);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
