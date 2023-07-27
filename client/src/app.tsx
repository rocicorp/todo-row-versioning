import {nanoid} from 'nanoid';
import React, {useEffect, useState} from 'react';
import {ReadTransaction, Replicache} from 'replicache';
import {useSubscribe} from 'replicache-react';
import {M, TodoUpdate, todosByList} from 'shared';
import Header from './components/header';
import MainSection from './components/main-section';
import {getList, listLists} from 'shared/src/list';
import Navigo from 'navigo';

// This is the top-level component for our app.
const App = ({rep}: {rep: Replicache<M>; userID: string}) => {
  const router = new Navigo('/');
  const [listID, setListID] = useState('');

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

  const lists = useSubscribe(rep, listLists, [], [rep]);
  lists.sort((a, b) => a.name.localeCompare(b.name));

  const selectedList = useSubscribe(
    rep,
    (tx: ReadTransaction) => getList(tx, listID),
    undefined,
    [rep, listID],
  );

  useEffect(() => {
    // If the list has been deleted, nav elsewhere.
    if (listID && !selectedList) {
      const path = lists.length > 0 ? `/list/${lists[0].id}` : '/';
      router.navigate(path);
    }
  }, [router, listID, lists]);

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
    rep.mutate.createTodo({
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
          onNewItem={handleNewItem}
          onNewList={handleNewList}
          onDeleteList={handleDeleteList}
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
    </div>
  );
};

export default App;
