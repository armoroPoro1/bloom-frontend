import {createContext, useContext, useRef, useState, useSyncExternalStore} from 'react';
import type {ComponentPropsWithoutRef, FormEvent, MouseEvent, ReactNode} from 'react';
import {getActivity, subscribeActivity, trackActivity} from './activity';

const FormPending = createContext(false);

function usePendingHandler<E>() {
  const active = useRef(false);
  const [pending, setPending] = useState(false);
  const run = (event: E, handler?: (event: E) => unknown) => {
    if (active.current || !handler) return;
    active.current = true;
    try {
      const result = handler(event);
      if (!result || typeof (result as PromiseLike<unknown>).then !== 'function') {
        active.current = false;
        return;
      }
      setPending(true);
      return trackActivity('action', () => Promise.resolve(result)).finally(() => {
        active.current = false;
        setPending(false);
      });
    } catch (error) {
      active.current = false;
      throw error;
    }
  };
  return {pending, run};
}

export function ActionButton({children, disabled, onClick, ...props}: Omit<ComponentPropsWithoutRef<'button'>, 'onClick'> & {
  onClick?: (event: MouseEvent<HTMLButtonElement>) => unknown;
}) {
  const {pending, run} = usePendingHandler<MouseEvent<HTMLButtonElement>>();
  const formPending = useContext(FormPending);
  const busy = pending || (props.type === 'submit' && formPending);
  return <button {...props} disabled={disabled || busy} aria-busy={busy || undefined}
    className={[props.className, busy && 'action-is-pending'].filter(Boolean).join(' ')}
    onClick={onClick ? event => run(event, onClick) : undefined}>
    {busy && <span className="action-spinner" aria-hidden="true" />}{children}
  </button>;
}

export function ActionForm({children, onSubmit, ...props}: Omit<ComponentPropsWithoutRef<'form'>, 'onSubmit'> & {
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => unknown;
}) {
  const {pending, run} = usePendingHandler<FormEvent<HTMLFormElement>>();
  return <FormPending.Provider value={pending}>
    <form {...props} aria-busy={pending || undefined} onSubmit={event => {
      event.preventDefault();
      return run(event, onSubmit);
    }}>{children}</form>
  </FormPending.Provider>;
}

export function OperationProgress() {
  const activity = useSyncExternalStore(subscribeActivity, getActivity, () => null);
  if (!activity) return null;
  return <div className="operation-progress" role="status" aria-live="polite" aria-atomic="true">
    <span className="action-spinner" aria-hidden="true" />
    {activity === 'action' ? 'กำลังดำเนินการ…' : 'กำลังโหลดข้อมูล…'}
  </div>;
}
