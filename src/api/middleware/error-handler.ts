import { Request, Response, NextFunction } from 'express';

/**
 * Global error handling middleware
 */
export const errorHandler = (err: any, _req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);

  // Check if response already sent
  if (res.headersSent) {
    return next(err);
  }

  // Handle JSON parse errors (body-parser)
  if (err.type === 'entity.parse.failed' || err.status === 400) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid JSON in request body',
      statusCode: 400,
      timestamp: new Date(),
    });
  }

  // Default to 500
  return res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    statusCode: 500,
    timestamp: new Date(),
  });
};

/**
 * 404 Not Found middleware
 */
export const notFoundHandler = (req: Request, res: Response) => {
  return res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
    timestamp: new Date(),
  });
};

/**
 * Async route handler wrapper to catch errors
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
