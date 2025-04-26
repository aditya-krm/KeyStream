import express from 'express';
import cors from 'cors';
import config from './config/config.js';
import logger from './utils/logger.js';
import routes from './routes/index.js';
import { responseHandler, notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import fs from 'fs';

// Ensure required directories exist
for (const dir of [config.paths.data, config.paths.logs]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Created directory: ${dir}`);
  }
}

// Initialize Express app
const app = express();
const PORT = config.server.port;

// Middleware
app.use(cors());
app.use(express.json());
app.use(logger.httpLogger()); // HTTP request logging
app.use(responseHandler); // Response formatter

// API Routes
app.use('/', routes);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`, {
    port: PORT,
    environment: config.server.nodeEnv,
    logLevel: config.logging.level
  });
});

export default app;