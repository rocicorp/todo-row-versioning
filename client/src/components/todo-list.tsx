import {Todo, TodoUpdate} from 'shared';
import {For} from 'solid-js';
import {TodoItem} from './todo-item';

const TodoList = (props: {
  todos: Todo[];
  onUpdateTodo: (update: TodoUpdate) => void;
  onDeleteTodo: (id: string) => void;
}) => (
  <ul class="todo-list">
    <For each={props.todos}>
      {todo => (
        <TodoItem
          todo={todo}
          onUpdate={update => props.onUpdateTodo(update)}
          onDelete={() => props.onDeleteTodo(todo.id)}
        />
      )}
    </For>
  </ul>
);

export default TodoList;
