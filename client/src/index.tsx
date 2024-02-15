import {nanoid} from 'nanoid';
import React, {useCallback, useEffect, useState} from 'react';
import ReactDOM from 'react-dom/client';
import {Replicache} from 'replicache';
import {useDebouncedCallback} from 'use-debounce';
import App from './app';
import './index.css';
import {mutators} from './mutators';

async function init() {
  // See https://doc.replicache.dev/licensing for how to get a license key.
  const licenseKey = import.meta.env.VITE_REPLICACHE_LICENSE_KEY;
  if (!licenseKey) {
    throw new Error('Missing VITE_REPLICACHE_LICENSE_KEY');
  }

  const r = new Replicache({
    name: 'anon',
    licenseKey,
    mutators,
    logLevel: 'debug',
  });

  function Root() {
    const [userID, setUserID] = useState('');
    const storageListener = useCallback(() => {
      let userID = localStorage.getItem('userID');
      if (!userID) {
        userID = nanoid(6);
        localStorage.setItem('userID', userID);
      }
      setUserID(userID);
    }, []);
    useEffect(() => {
      storageListener();
      addEventListener('storage', storageListener, false);
      return () => {
        removeEventListener('storage', storageListener, false);
      };
    }, []);

    const updateReplicache = useDebouncedCallback(() => {
      console.log('updating replicache');
      r.pull().catch(e => console.error('Pull failed', e));
    }, 200);
    useEffect(() => {
      r.pushURL = `/api/replicache/push?userID=${userID}`;
      r.pullURL = `/api/replicache/pull?userID=${userID}`;
      void updateReplicache();
    }, [userID]);

    const handleUserIDChange = (userID: string) => {
      localStorage.setItem('userID', userID);
      storageListener();
    };

    return (
      <App
        rep={r}
        userID={userID}
        onUserIDChange={userID => handleUserIDChange(userID)}
      />
    );
  }

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <Root />
    </React.StrictMode>,
  );
}

await init();
