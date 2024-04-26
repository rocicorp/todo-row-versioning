import {Dialog} from '@headlessui/react';
import {nanoid} from 'nanoid';
import Navigo from 'navigo';
import {useEffect, useState} from 'react';
import {Replicache} from 'replicache';
import {List, Todo, TodoUpdate} from 'shared';
import Header from './components/header';
import MainSection from './components/main-section';
import {Share} from './components/share';
import {M} from './mutators';
import {useQuery, useTable} from './use-query';

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

  useEffect(() => {
    router.on('/list/:listID', match => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const {data} = match!;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const {listID} = data!;
      setListID(listID);
    });
    return () => {
      router.off('/list/:listID');
    };
  });
  useEffect(() => {
    router.resolve();
  }, []);

  // Listen for pokes related to just this list.
  useEventSourcePoke(`/api/replicache/poke?channel=list/${listID}`, rep);
  // Listen for pokes related to the docs this user has access to.
  useEventSourcePoke(`/api/replicache/poke?channel=user/${userID}`, rep);

  const listTable = useTable<List>(rep, 'list');
  const todoTable = useTable<Todo>(rep, 'todo');

  const allListsQuery = listTable.select('id', 'name').asc('name');
  const lists = useQuery(allListsQuery);

  const selectedListsQuery = allListsQuery.where('id', '=', listID).limit(1);
  const selectedLists = useQuery(selectedListsQuery, [listID]);
  const selectedList = selectedLists[0];

  const todosQuery = todoTable
    .select('id', 'listID', 'text', 'completed', 'sort')
    .where('listID', '=', listID)
    .desc('sort');
  const todos = useQuery(todosQuery, [listID]);

  const todosCount = useQuery(todoTable.where('listID', '=', listID).count());

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
      <div>listID: {listID}</div>
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
              }}
            >
              {list.name}
            </a>
          );
        })}
      </div>
      <div className="todoapp">
        <Header
          listName={selectedList?.name + ' (' + todosCount + ' items)'}
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

function useEventSourcePoke(url: string, rep: Replicache<M>) {
  useEffect(() => {
    const ev = new EventSource(url);
    ev.onmessage = () => {
      void rep.pull();
    };
    return () => ev.close();
  }, [url, rep]);
}

export default App;
