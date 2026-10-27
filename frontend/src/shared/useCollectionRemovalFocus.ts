import { useLayoutEffect, useRef } from 'react';

// Wait for the updated collection so a previously disabled Add button is usable.
export function useCollectionRemovalFocus() {
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const pending = useRef(false);
  useLayoutEffect(() => {
    if (!pending.current) return;
    pending.current = false;
    addButtonRef.current?.focus();
  });
  function remove(update: () => void) {
    pending.current = true;
    update();
  }
  return { addButtonRef, remove };
}
