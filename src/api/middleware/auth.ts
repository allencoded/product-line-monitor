import { Request, Response, NextFunction } from 'express';

/**
 * Simple API key authentication middleware
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;

  // In development, allow requests without API key
  if (process.env.NODE_ENV === 'development' && !process.env.API_KEY) {
    return next();
  }

  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key is required',
      statusCode: 401,
      timestamp: new Date(),
    });
  }

  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid API key',
      statusCode: 403,
      timestamp: new Date(),
    });
  }

  next();
};
