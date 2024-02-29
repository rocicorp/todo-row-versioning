import {Show, createSignal} from 'solid-js';
import TodoTextInput from './todo-text-input';

const Header = (props: {
  listName: string | undefined;
  userID: string;
  onNewItem: (text: string) => void;
  onNewList: (text: string) => void;
  onDeleteList: () => void;
  onUserIDChange: (userID: string) => void;
  onShare: () => void;
}) => {
  const [typedUserID, setTypedUserID] = createSignal(props.userID);

  const handleNewList = () => {
    const name = prompt('Enter a new list name');
    if (name) {
      props.onNewList(name);
    }
  };

  const handleDeleteList = () => {
    if (!confirm('Really delete current list?')) {
      return;
    }
    props.onDeleteList();
  };

  return (
    <header class="header">
      <h1>{props.listName ?? 'todos'}</h1>
      <div id="toolbar">
        <div id="login">
          UserID:&nbsp;
          <input
            type="text"
            id="userID"
            value={typedUserID()}
            onInput={e => setTypedUserID(e.target.value)}
            onBlur={e => props.onUserIDChange(e.target.value)}
          />
        </div>
        <div id="buttons">
          <input type="button" onClick={handleNewList} value="New List" />
          <input
            type="button"
            value="Delete List"
            disabled={!props.listName}
            onClick={() => handleDeleteList()}
          />
          <input
            type="button"
            value="Share"
            disabled={!props.listName}
            onClick={() => props.onShare()}
          />
        </div>
      </div>
      <Show when={props.listName}>
        <TodoTextInput
          initial=""
          placeholder="What needs to be done?"
          onSubmit={props.onNewItem}
        />
      </Show>
    </header>
  );
};

export default Header;
