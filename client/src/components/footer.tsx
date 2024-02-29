import {For} from 'solid-js';
import FilterLink from './link';

const FILTER_TITLES = ['All', 'Active', 'Completed'];

const Footer = (props: {
  active: number;
  completed: number;
  currentFilter: string;
  onFilter: (filter: string) => void;
  onDeleteCompleted: () => void;
}) => {
  const itemWord = () => (props.active === 1 ? 'item' : 'items');
  return (
    <footer class="footer">
      <span class="todo-count">
        <strong>{props.active || 'No'}</strong> {itemWord()} left
      </span>
      <ul class="filters">
        <For each={FILTER_TITLES}>
          {filter => (
            <li>
              <FilterLink
                onClick={() => props.onFilter(filter)}
                selected={filter === props.currentFilter}
              >
                {filter}
              </FilterLink>
            </li>
          )}
        </For>
      </ul>
      {props.completed > 0 && (
        <button
          class="clear-completed"
          onClick={() => props.onDeleteCompleted()}
        >
          Clear completed
        </button>
      )}
    </footer>
  );
};

export default Footer;
