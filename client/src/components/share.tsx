import {nanoid} from 'nanoid';
import {Replicache} from 'replicache';
import {Share as ShareModel, listShares} from 'shared';
import {For, Show, onCleanup} from 'solid-js';
import {createEffectAccessor} from '../create-effect-accessor.js';
import {M} from '../mutators';

const Share = (props: {rep: Replicache<M>; listID: string}) => {
  const guests = createEffectAccessor<ShareModel[]>(set => {
    const {rep, listID} = props;
    onCleanup(
      rep.subscribe(async tx => {
        const allShares = await listShares(tx);
        return allShares.filter(a => a.listID === listID);
      }, set),
    );
  }, []);

  const handleSubmit = (e: SubmitEvent) => {
    const {rep, listID} = props;
    void rep.mutate.createShare({
      id: nanoid(),
      listID,
      userID: (e.target as HTMLFormElement).userID.value,
    });
    e.preventDefault();
  };

  const handleDelete = async (id: string) => {
    await props.rep.mutate.deleteShare(id);
  };

  return (
    <div id="share-content">
      <h1>Add Collaborator</h1>
      <form id="add-collaborator" onSubmit={handleSubmit}>
        <label for="userID">UserID:</label>
        <input type="text" id="userID" required={true} />
        <input type="submit" value="Add" />
      </form>
      <h1>Current Collaborators</h1>
      <div id="current-collaborators">
        <Show when={guests().length > 0} fallback="No guests">
          <table>
            <tbody>
              <For each={guests()}>
                {g => (
                  <tr>
                    <td>{g.userID}</td>
                    <td>
                      <button
                        class="destroy"
                        onClick={() => handleDelete(g.id)}
                      >
                        x
                      </button>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Show>
      </div>
    </div>
  );
};

export default Share;
