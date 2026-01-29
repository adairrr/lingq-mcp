import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';

const AUTH_TOKEN = process.env.AUTH_TOKEN;
const TRANSPORT_MODE = process.env.TRANSPORT_MODE || 'http';

// Only require AUTH_TOKEN in HTTP mode
if (TRANSPORT_MODE === 'http' && !AUTH_TOKEN) {
  console.error('Error: AUTH_TOKEN environment variable is required in HTTP mode');
  console.error('Generate a secure token with: openssl rand -hex 32');
  process.exit(1);
}

export interface AuthRequest extends Request {
  isAuthenticated?: boolean;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Bearer token in Authorization header'
    });
    return;
  }

  // Runtime guard for AUTH_TOKEN (TypeScript narrowing doesn't work after process.exit)
  if (!AUTH_TOKEN) {
    res.status(500).json({
      error: 'Server Configuration Error',
      message: 'Authentication not configured'
    });
    return;
  }

  // Use timing-safe comparison to prevent timing attacks
  const tokenBuffer = Buffer.from(token);
  const authBuffer = Buffer.from(AUTH_TOKEN);

  if (tokenBuffer.length !== authBuffer.length || !timingSafeEqual(tokenBuffer, authBuffer)) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid authentication token'
    });
    return;
  }

  req.isAuthenticated = true;
  next();
}
