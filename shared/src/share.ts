import {z} from 'zod';
import {generate} from '@rocicorp/rails';

export const shareSchema = z.object({
  id: z.string(),
  listID: z.string(),
  userID: z.string(),
});

export type Share = z.infer<typeof shareSchema>;

export const {
  init: createShare,
  list: listShares,
  delete: deleteShare,
} = generate('share', shareSchema.parse);
