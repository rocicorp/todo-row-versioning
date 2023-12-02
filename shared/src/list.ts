import {z} from 'zod';
import {generate, Update} from '@rocicorp/rails';

export const listSchema = z.object({
  id: z.string(),
  name: z.string(),
  ownerID: z.string(),
});

export type List = z.infer<typeof listSchema>;
export type ListUpdate = Update<List>;

export const {
  init: createList,
  list: listLists,
  get: getList,
  delete: deleteList,
} = generate('list', listSchema.parse);
