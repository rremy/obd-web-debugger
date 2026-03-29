import { Observable } from 'rxjs';
import { useEffect, useState } from 'react';

export function useObservable<T>(obs$: Observable<T>, initial: T): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const sub = obs$.subscribe(setValue);
    return () => sub.unsubscribe();
  }, [obs$]);
  return value;
}
