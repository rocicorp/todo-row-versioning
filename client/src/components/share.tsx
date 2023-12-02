import {useSubscribe} from 'replicache-react';
import {M} from '../mutators';
import {Replicache} from 'replicache';
import {listShares} from 'shared';
import {FormEvent} from 'react';
import {Dialog} from '@headlessui/react';
import {nanoid} from 'nanoid';

export function Share({rep, listID}: {rep: Replicache<M>; listID: string}) {
  const guests = useSubscribe(
    rep,
    async tx => {
      const allShares = await listShares(tx);
      return allShares.filter(a => a.listID === listID);
    },
    {default: []},
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    void rep.mutate.createShare({
      id: nanoid(),
      listID,
      userID: (e.target as HTMLFormElement).userID.value,
    });
    e.preventDefault();
  };

  const handleDelete = async (id: string) => {
    await rep.mutate.deleteShare(id);
  };

  return (
    <>
      <div id="share-overlay" aria-hidden="true" />
      <Dialog.Panel>
        <div id="share-content">
          <h1>Add Collaborator</h1>
          <form id="add-collaborator" onSubmit={e => handleSubmit(e)}>
            <label htmlFor="userID">UserID:</label>
            <input type="text" id="userID" required={true} />
            <input type="submit" value="Add" />
          </form>
          <h1>Current Collaborators</h1>
          <div id="current-collaborators">
            {guests.length === 0 ? (
              'No guests'
            ) : (
              <table>
                <tbody>
                  {guests.map(g => (
                    <tr key={g.id}>
                      <td>{g.userID}</td>
                      <td>
                        <button
                          className="destroy"
                          onClick={() => handleDelete(g.id)}
                        >
                          x
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Dialog.Panel>
    </>
  );
}
