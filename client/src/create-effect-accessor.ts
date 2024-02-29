import {Accessor, Setter, createEffect, createSignal} from 'solid-js';

export function createEffectAccessor<T>(
  fn: (setter: Setter<T>) => void,
  def: T,
): Accessor<T> {
  const [getter, setter] = createSignal<T>(def);
  createEffect(() => {
    fn(setter);
  });
  return getter;
}
