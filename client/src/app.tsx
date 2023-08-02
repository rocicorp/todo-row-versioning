import {nanoid} from 'nanoid';
import React, {useEffect, useState} from 'react';
import {ReadTransaction, Replicache} from 'replicache';
import {useSubscribe} from 'replicache-react';
import {TodoUpdate, todosByList} from 'shared';
import {M} from './mutators';
import Header from './components/header';
import MainSection from './components/main-section';
import {getList, listLists} from 'shared/src/list';
import Navigo from 'navigo';
import {Share} from './components/share';
import {Dialog} from '@headlessui/react';

// This is the top-level component for our app.
const App = ({
  rep,
  userID,
  onUserIDChange,
}: {
  rep: Replicache<M>;
  userID: string;
  onUserIDChange: (userID: string) => void;
}) => {
  const router = new Navigo('/');
  const [listID, setListID] = useState('');
  const [showingShare, setShowingShare] = useState(false);

  router.on('/list/:listID', match => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const {data} = match!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const {listID} = data!;
    setListID(listID);
  });

  useEffect(() => {
    router.resolve();
  }, []);

  useEffect(() => {
    // Listen for pokes related to just this list.
    const ev = new EventSource(`/api/replicache/poke?channel=list/${listID}`);
    ev.onmessage = async () => rep.pull();
    return () => ev.close();
  }, [listID]);

  useEffect(() => {
    // Listen for pokes related to the docs this user has access to.
    const ev = new EventSource(`/api/replicache/poke?channel=user/${userID}`);
    ev.onmessage = async () => rep.pull();
    return () => ev.close();
  }, [userID]);

  const lists = useSubscribe(rep, listLists, [], [rep]);
  lists.sort((a, b) => a.name.localeCompare(b.name));

  const selectedList = useSubscribe(
    rep,
    (tx: ReadTransaction) => getList(tx, listID),
    undefined,
    [rep, listID],
  );

  // Subscribe to all todos and sort them.
  const todos = useSubscribe(
    rep,
    async tx => todosByList(tx, listID),
    [],
    [rep, listID],
  );
  todos.sort((a, b) => a.sort - b.sort);

  // Define event handlers and connect them to Replicache mutators. Each
  // of these mutators runs immediately (optimistically) locally, then runs
  // again on the server-side automatically.
  const handleNewItem = (text: string) => {
    void rep.mutate.createTodo({
      id: nanoid(),
      listID,
      text,
      completed: false,
    });
  };

  const handleUpdateTodo = (update: TodoUpdate) =>
    rep.mutate.updateTodo(update);

  const handleDeleteTodos = async (ids: string[]) => {
    for (const id of ids) {
      await rep.mutate.deleteTodo(id);
    }
  };

  const handleCompleteTodos = async (completed: boolean, ids: string[]) => {
    for (const id of ids) {
      await rep.mutate.updateTodo({
        id,
        completed,
      });
    }
  };

  const handleNewList = async (name: string) => {
    const id = nanoid();
    await rep.mutate.createList({
      id,
      ownerID: userID,
      name,
    });
    router.navigate(`/list/${id}`);
  };

  const handleDeleteList = async () => {
    await rep.mutate.deleteList(listID);
  };

  // Render app.

  return (
    <div id="layout">
      <div id="nav">
        {lists.map(list => {
          const path = `/list/${list.id}`;
          return (
            <a
              key={list.id}
              href={path}
              onClick={e => {
                router.navigate(path);
                e.preventDefault();
                return false;
              }}
            >
              {list.name}
            </a>
          );
        })}
      </div>
      <div className="todoapp">
        <Header
          listName={selectedList?.name}
          userID={userID}
          onNewItem={handleNewItem}
          onNewList={handleNewList}
          onDeleteList={handleDeleteList}
          onUserIDChange={onUserIDChange}
          onShare={() => setShowingShare(!showingShare)}
        />
        {selectedList ? (
          <MainSection
            todos={todos}
            onUpdateTodo={handleUpdateTodo}
            onDeleteTodos={handleDeleteTodos}
            onCompleteTodos={handleCompleteTodos}
          />
        ) : (
          <div id="no-list-selected">No list selected</div>
        )}
      </div>
      <div className="spacer" />
      <Dialog open={showingShare} onClose={() => setShowingShare(false)}>
        <Share rep={rep} listID={listID} />
      </Dialog>
    </div>
  );
};

export default App;
