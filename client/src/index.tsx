import {Route, Router} from '@solidjs/router';
import {nanoid} from 'nanoid';
import {Replicache} from 'replicache';
import {Show, createEffect, createSignal, onCleanup, onMount} from 'solid-js';
import {render} from 'solid-js/web';
import App from './app.jsx';
import './index.css';
import {M, mutators} from './mutators';

function init() {
  // See https://doc.replicache.dev/licensing for how to get a license key.
  const licenseKey = import.meta.env.VITE_REPLICACHE_LICENSE_KEY;
  if (!licenseKey) {
    throw new Error('Missing VITE_REPLICACHE_LICENSE_KEY');
  }

  function Root() {
    const [userID, setUserID] = createSignal('');
    const [r, setR] = createSignal<Replicache<M> | null>(null);

    createEffect(() => {
      if (!userID()) {
        return;
      }
      console.log('updating replicache');

      const newInstance = new Replicache({
        name: userID(),
        licenseKey,
        mutators,
        pushURL: `/api/replicache/push?userID=${userID()}`,
        pullURL: `/api/replicache/pull?userID=${userID()}`,
        logLevel: 'debug',
      });
      setR(newInstance);

      onCleanup(async () => {
        const instance = r();
        if (instance) {
          console.log('closing replicache');
          await instance.close();
        }
      });
    });

    const storageListener = () => {
      let userID = localStorage.getItem('userID');
      if (!userID) {
        userID = nanoid(6);
        localStorage.setItem('userID', userID);
      }
      setUserID(userID);
    };

    storageListener();
    onMount(() => {
      addEventListener('storage', storageListener, false);
      onCleanup(() => {
        removeEventListener('storage', storageListener, false);
      });
    });

    const handleUserIDChange = (userID: string) => {
      localStorage.setItem('userID', userID);
      storageListener();
    };

    return (
      <Router>
        <Route
          path={['/', '/list/:listID']}
          component={() => (
            <Show when={r()} keyed>
              {rep => (
                <App
                  rep={rep}
                  userID={userID()}
                  onUserIDChange={handleUserIDChange}
                />
              )}
            </Show>
          )}
        />
      </Router>
    );
  }

  render(() => <Root />, document.getElementById('root') as HTMLElement);
}

init();
