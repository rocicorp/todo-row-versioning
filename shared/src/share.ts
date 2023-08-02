import {z} from 'zod';
import {entitySchema, generate} from '@rocicorp/rails';

export const shareSchema = entitySchema.extend({
  listID: z.string(),
  userID: z.string(),
});

export type Share = z.infer<typeof shareSchema>;

export const {
  init: createShare,
  list: listShares,
  delete: deleteShare,
} = generate('share', shareSchema);
