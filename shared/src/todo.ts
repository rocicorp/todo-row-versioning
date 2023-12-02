// This file defines our Todo domain type in TypeScript, and a related helper
// function to get all Todos. You'd typically have one of these files for each
// domain object in your application.

import {z} from 'zod';
import {generate, Update} from '@rocicorp/rails';
import type {ReadTransaction} from 'replicache';

export const todoSchema = z.object({
  id: z.string(),
  listID: z.string(),
  text: z.string(),
  completed: z.boolean(),
  sort: z.number(),
});

export type Todo = z.infer<typeof todoSchema>;
export type TodoUpdate = Update<Todo>;

export const {
  put: putTodo,
  get: getTodo,
  update: updateTodo,
  delete: deleteTodo,
  list: listTodos,
} = generate('todo', todoSchema.parse);

export async function todosByList(tx: ReadTransaction, listID: string) {
  // TODO: would be better to use an index, but rails doesn't support yet.
  const allTodos = await listTodos(tx);
  return allTodos.filter(todo => todo.listID === listID);
}
