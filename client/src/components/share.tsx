import {Dialog} from '@headlessui/react';
import {nanoid} from 'nanoid';
import {FormEvent} from 'react';
import {Replicache} from 'replicache';
import {Share as ShareType} from 'shared';
import {M} from '../mutators';
import {useQuery, useTable} from '../use-query.js';

export function Share({rep, listID}: {rep: Replicache<M>; listID: string}) {
  const shareTable = useTable<ShareType>(rep, 'share');
  const guests = useQuery(
    shareTable
      .select('id', 'listID', 'userID')
      .asc('userID')
      .where('listID', '=', listID),
    [listID],
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
