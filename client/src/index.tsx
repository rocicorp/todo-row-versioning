import {nanoid} from 'nanoid';
import React, {useCallback, useEffect, useState} from 'react';
import ReactDOM from 'react-dom/client';
import {Replicache} from 'replicache';
import App from './app';
import './index.css';
import {M, mutators} from './mutators';

async function init() {
  // See https://doc.replicache.dev/licensing for how to get a license key.
  const licenseKey = import.meta.env.VITE_REPLICACHE_LICENSE_KEY;
  if (!licenseKey) {
    throw new Error('Missing VITE_REPLICACHE_LICENSE_KEY');
  }

  function Root() {
    const [userID, setUserID] = useState('');
    const [r, setR] = useState<Replicache<M> | null>(null);

    useEffect(() => {
      if (!userID) {
        return;
      }
      console.log('updating replicache');
      const r = new Replicache({
        name: userID,
        licenseKey,
        mutators,
        pushURL: `/api/replicache/push?userID=${userID}`,
        pullURL: `/api/replicache/pull?userID=${userID}`,
        logLevel: 'debug',
      });
      setR(r);
      return () => {
        void r.close();
      };
    }, [userID]);

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

    const handleUserIDChange = (userID: string) => {
      localStorage.setItem('userID', userID);
      storageListener();
    };

    return (
      r && (
        <App
          rep={r}
          userID={userID}
          onUserIDChange={userID => handleUserIDChange(userID)}
        />
      )
    );
  }

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <Root />
    </React.StrictMode>,
  );
}

await init();
