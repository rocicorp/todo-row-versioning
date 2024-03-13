import {Todo, TodoUpdate} from 'shared';
import {Show, createSignal} from 'solid-js';
import Footer from './footer';
import TodoList from './todo-list';

const MainSection = (props: {
  todos: Todo[];
  onUpdateTodo: (update: TodoUpdate) => void;
  onDeleteTodos: (ids: string[]) => void;
  onCompleteTodos: (completed: boolean, ids: string[]) => void;
}) => {
  const todosCount = () => props.todos.length;
  const completed = () => props.todos.filter(todo => todo.completed);
  const completedCount = () => completed().length;
  const toggleAllValue = () => completedCount() === todosCount();

  const [filter, setFilter] = createSignal('All');

  const filteredTodos = () =>
    props.todos.filter(todo => {
      if (filter() === 'All') {
        return true;
      }
      if (filter() === 'Active') {
        return !todo.completed;
      }
      if (filter() === 'Completed') {
        return todo.completed;
      }
      throw new Error('Unknown filter: ' + filter);
    });

  const handleCompleteAll = () => {
    const {todos, onCompleteTodos} = props;
    const completed = !toggleAllValue();
    onCompleteTodos(
      completed,
      todos.map(todo => todo.id),
    );
  };

  return (
    <section class="main">
      {todosCount() > 0 && (
        <span>
          <input
            class="toggle-all"
            type="checkbox"
            checked={toggleAllValue()}
          />
          <label onClick={handleCompleteAll} />
        </span>
      )}
      <TodoList
        todos={filteredTodos()}
        onUpdateTodo={props.onUpdateTodo}
        onDeleteTodo={id => props.onDeleteTodos([id])}
      />
      <Show when={todosCount() > 0}>
        <Footer
          completed={completedCount()}
          active={todosCount() - completedCount()}
          onDeleteCompleted={() =>
            props.onDeleteTodos(completed().map(todo => todo.id))
          }
          currentFilter={filter()}
          onFilter={setFilter}
        />
      </Show>
    </section>
  );
};

export default MainSection;
