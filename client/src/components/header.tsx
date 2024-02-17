import {useState} from 'react';
import TodoTextInput from './todo-text-input';

const Header = ({
  listName,
  userID,
  onNewItem,
  onNewList,
  onDeleteList,
  onUserIDChange,
  onShare,
}: {
  listName: string | undefined;
  userID: string;
  onNewItem: (text: string) => void;
  onNewList: (text: string) => void;
  onDeleteList: () => void;
  onUserIDChange: (userID: string) => void;
  onShare: () => void;
}) => {
  const [typedUserID, setTypedUserID] = useState(userID);

  const handleNewList = () => {
    const name = prompt('Enter a new list name');
    if (name) {
      onNewList(name);
    }
  };

  const handleDeleteList = () => {
    if (!confirm('Really delete current list?')) {
      return;
    }
    onDeleteList();
  };

  return (
    <header className="header">
      <h1>{listName ?? 'todos'}</h1>
      <div id="toolbar">
        <div id="login">
          UserID:&nbsp;
          <input
            type="text"
            id="userID"
            value={typedUserID}
            onChange={e => setTypedUserID(e.target.value)}
            onBlur={e => onUserIDChange(e.target.value)}
          />
        </div>
        <div id="buttons">
          <input
            type="button"
            onClick={() => handleNewList()}
            value="New List"
          />
          <input
            type="button"
            value="Delete List"
            disabled={!listName}
            onClick={() => handleDeleteList()}
          />
          <input
            type="button"
            value="Share"
            disabled={!listName}
            onClick={() => onShare()}
          />
        </div>
      </div>
      {listName && (
        <TodoTextInput
          initial=""
          placeholder="What needs to be done?"
          onSubmit={onNewItem}
        />
      )}
    </header>
  );
};

export default Header;
