import type { Request, Response } from 'express';
import app from '../server';

export default function handler(req: Request, res: Response) {
  const rawUrl = req.url || '/';
  const parsed = new URL(rawUrl, 'http://localhost');
  const vPath = parsed.searchParams.get('__vercel_path');

  if (vPath !== null) {
    parsed.searchParams.delete('__vercel_path');
    const cleanSubpath = vPath.replace(/^\/+/, '');
    const qs = parsed.searchParams.toString();
    req.url = `/api${cleanSubpath ? `/${cleanSubpath}` : ''}${qs ? `?${qs}` : ''}`;
  }

  return app(req, res);
}
