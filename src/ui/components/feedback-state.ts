import { useCallback, useEffect, useRef, useState } from 'react';

export interface Mark {
  kind: 'good' | 'bad';
  id: number;
  /** Précision affichée sous la croix, par exemple la bonne réponse. */
  detail?: string;
}

export function useFeedback(): [Mark | null, (kind: Mark['kind'], detail?: string) => void] {
  const [mark, setMark] = useState<Mark | null>(null);
  const timer = useRef(0);
  const counter = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const show = useCallback((kind: Mark['kind'], detail?: string) => {
    counter.current += 1;
    setMark({ kind, id: counter.current, detail });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMark(null), detail ? 900 : 420);
  }, []);

  return [mark, show];
}
