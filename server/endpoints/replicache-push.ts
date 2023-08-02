import {z} from 'zod';
import {push} from '../src/push.js';

import type Express from 'express';

export async function handlePush(
  req: Express.Request,
  res: Express.Response,
  next: Express.NextFunction,
): Promise<void> {
  try {
    const userID = z.string().parse(req.query.userID);
    await push(userID, req.body);
    res.status(200).json({});
  } catch (e) {
    next(e);
  }
}
