// Server entry point - starts the Express application.

import app from "./app";
import { config } from "./config";
import { logger } from "./utils/logger";

app.listen(config.port, () => {
  logger.info(
    {
      port: config.port,
      env: config.nodeEnv,
      swagger: `http://localhost:${config.port}/api-docs`,
    },
    "Server started",
  );
});
