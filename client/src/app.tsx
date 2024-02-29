import {A, useNavigate, useParams} from '@solidjs/router';
import {nanoid} from 'nanoid';
import {Replicache} from 'replicache';
import {List, Todo, TodoUpdate, getList, listLists, todosByList} from 'shared';
import {
  Component,
  For,
  JSX,
  createEffect,
  createSignal,
  onCleanup,
} from 'solid-js';
import Header from './components/header.jsx';
import MainSection from './components/main-section.jsx';
import Share from './components/share.jsx';
import {createEffectAccessor} from './create-effect-accessor.js';
import {M} from './mutators';

// This is the top-level component for our app.
const App = (props: {
  rep: Replicache<M>;
  userID: string;
  onUserIDChange: (userID: string) => void;
}) => {
  const [showingShare, setShowingShare] = createSignal(false);

  const params = useParams();

  createEffect(() => {
    const {listID} = params;
    if (!listID) {
      return;
    }
    // Listen for pokes related to just this list.
    useEventSourcePoke(
      `/api/replicache/poke?channel=list/${listID}`,
      props.rep,
    );
    // Listen for pokes related to the docs this user has access to.
    useEventSourcePoke(
      `/api/replicache/poke?channel=user/${props.userID}`,
      props.rep,
    );
  });

  const lists = createEffectAccessor<List[]>(
    set =>
      onCleanup(
        props.rep.subscribe(async tx => {
          const arr = await listLists(tx);
          return arr.sort((a, b) => a.name.localeCompare(b.name));
        }, set),
      ),
    [],
  );

  const selectedList = createEffectAccessor<List | undefined>(async set => {
    const {listID} = params;
    set(await props.rep.query(tx => getList(tx, listID)));
  }, undefined);

  // Subscribe to all todos and sort them.
  const todos = createEffectAccessor<Todo[]>(set => {
    const {rep} = props;
    const {listID} = params;
    onCleanup(
      rep.subscribe(async tx => {
        const todos = await todosByList(tx, listID);
        return todos.sort((a, b) => a.sort - b.sort);
      }, set),
    );
  }, []);

  // Define event handlers and connect them to Replicache mutators. Each
  // of these mutators runs immediately (optimistically) locally, then runs
  // again on the server-side automatically.
  const handleNewItem = (text: string) => {
    void props.rep.mutate.createTodo({
      id: nanoid(),
      listID: params.listID,
      text,
      completed: false,
    });
  };

  const handleUpdateTodo = (update: TodoUpdate) =>
    props.rep.mutate.updateTodo(update);

  const handleDeleteTodos = async (ids: string[]) => {
    for (const id of ids) {
      await props.rep.mutate.deleteTodo(id);
    }
  };

  const handleCompleteTodos = async (completed: boolean, ids: string[]) => {
    for (const id of ids) {
      await props.rep.mutate.updateTodo({
        id,
        completed,
      });
    }
  };

  const navigate = useNavigate();

  const handleNewList = async (name: string) => {
    const {userID} = props;
    const id = nanoid();
    await props.rep.mutate.createList({
      id,
      ownerID: userID,
      name,
    });
    navigate(`/list/${id}`);
  };

  const handleDeleteList = async () => {
    await props.rep.mutate.deleteList(params.listID);
    navigate('/');
  };

  // Render app.
  return (
    <div id="layout">
      <div id="nav">
        <For each={lists()} fallback={<div>No lists</div>}>
          {list => <A href={`/list/${list.id}`}>{list.name}</A>}
        </For>
      </div>
      <div class="todoapp">
        <Header
          listName={selectedList()?.name}
          userID={props.userID}
          onNewItem={handleNewItem}
          onNewList={handleNewList}
          onDeleteList={handleDeleteList}
          onUserIDChange={props.onUserIDChange}
          onShare={() => setShowingShare(!showingShare())}
        />
        {selectedList() ? (
          <MainSection
            todos={todos()}
            onUpdateTodo={handleUpdateTodo}
            onDeleteTodos={handleDeleteTodos}
            onCompleteTodos={handleCompleteTodos}
          />
        ) : (
          <div id="no-list-selected">No list selected</div>
        )}
      </div>
      <div class="spacer" />
      <Dialog
        open={showingShare()}
        onClose={() => setShowingShare(false)}
        class="share-dialog"
      >
        <Share rep={props.rep} listID={params.listID} />
      </Dialog>
    </div>
  );
};

function useEventSourcePoke(url: string, rep: Replicache<M>) {
  createEffect(() => {
    const ev = new EventSource(url);
    ev.onmessage = () => {
      void rep.pull();
    };
    onCleanup(() => ev.close());
  });
}

export default App;

const Dialog: Component<{
  open: boolean;
  children: JSX.Element;
  onClose: () => void;
  class?: string;
}> = props => {
  let el!: HTMLDialogElement;
  const onClick = (e: MouseEvent) => {
    const dialogDimensions = el.getBoundingClientRect();
    if (
      e.clientX < dialogDimensions.left ||
      e.clientX > dialogDimensions.right ||
      e.clientY < dialogDimensions.top ||
      e.clientY > dialogDimensions.bottom
    ) {
      el.close();
    }
  };

  const onClose = () => {
    props.onClose();
  };

  createEffect(() => {
    if (props.open) {
      el.showModal();
    } else {
      el.close();
    }
  });

  return (
    <dialog ref={el} onClick={onClick} onClose={onClose} class={props.class}>
      {props.children}
    </dialog>
  );
};
