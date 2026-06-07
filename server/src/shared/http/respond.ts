import type { Response } from 'express';
import type { Paginated } from '../types/index.js';

export function ok<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({ success: true, data });
}

export function created<T>(res: Response, data: T): Response {
  return res.status(201).json({ success: true, data });
}

export function paginated<T>(res: Response, result: Paginated<T>): Response {
  return res.status(200).json({ success: true, ...result });
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}
