type ActivityKind = 'read' | 'action';

const subscribers = new Set<() => void>();
let reads = 0;
let actions = 0;

export function subscribeActivity(listener: () => void) {
  subscribers.add(listener);
  return () => { subscribers.delete(listener); };
}

export function getActivity(): ActivityKind | null {
  return actions ? 'action' : reads ? 'read' : null;
}

export async function trackActivity<T>(kind: ActivityKind, operation: () => Promise<T>): Promise<T> {
  if (kind === 'action') actions++;
  else reads++;
  subscribers.forEach(listener => listener());
  try {
    return await operation();
  } finally {
    if (kind === 'action') actions--;
    else reads--;
    subscribers.forEach(listener => listener());
  }
}
