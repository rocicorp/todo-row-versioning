import {Todo, TodoUpdate} from 'shared';
import {Show, createSignal} from 'solid-js';
import TodoTextInput from './todo-text-input';

export const TodoItem = (props: {
  todo: Todo;
  onUpdate: (update: TodoUpdate) => void;
  onDelete: () => void;
}) => {
  const [editing, setEditing] = createSignal(false);

  const handleDoubleClick = () => {
    setEditing(true);
  };

  const handleSave = (text: string) => {
    if (text.length === 0) {
      props.onDelete();
    } else {
      props.onUpdate({id: props.todo.id, text});
    }
    setEditing(false);
  };

  const handleToggleComplete = () =>
    props.onUpdate({id: props.todo.id, completed: !props.todo.completed});

  return (
    <li
      classList={{
        completed: props.todo.completed,
        editing: editing(),
      }}
    >
      <Show
        when={editing()}
        fallback={
          <div class="view">
            <input
              class="toggle"
              type="checkbox"
              checked={props.todo.completed}
              onChange={handleToggleComplete}
            />
            <label onDblClick={handleDoubleClick}>{props.todo.text}</label>
            <button class="destroy" onClick={() => props.onDelete()} />
          </div>
        }
      >
        <TodoTextInput
          initial={props.todo.text}
          onSubmit={handleSave}
          onBlur={handleSave}
        />
      </Show>
    </li>
  );
};
