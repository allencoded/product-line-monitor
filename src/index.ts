import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { apiRoutes, errorHandler, notFoundHandler } from './api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Load OpenAPI specification
const openApiPath = path.join(__dirname, '../openapi.yaml');
const openApiDocument = yaml.load(fs.readFileSync(openApiPath, 'utf8'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later',
    statusCode: 429,
    timestamp: new Date(),
  },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for batch ingestion
app.use(limiter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Swagger UI documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument as Record<string, any>, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Production Line Monitor API Docs',
}));


// API routes
app.use('/api', apiRoutes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Only start server if this file is run directly (not imported in tests)
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Production Line Monitor API listening on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api`);
    console.log(`API documentation available at http://localhost:${PORT}/api-docs`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down server...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export default app;
