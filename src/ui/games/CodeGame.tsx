import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { byCount } from '../../core/format';
import { tr } from '../../core/lang';
import { CODE_DURATION_MS, codeLevel, codePoints, generateCodes, hintCounts, pegHints, scoreCode, type CodeLevel } from '../../core/games/code';
import { createRng } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { Icon } from '../components/Icon';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameClock } from '../game/clock';
import { GameHud, TimeLeft } from '../game/Hud';
import { slow } from '../tempo';
import { EchoShape } from './EchoGame';

/** Un pion : la couleur et la forme d'Écho (on les distingue aussi sans les couleurs). */
export function Peg({ color, hint }: { color: number | null; hint?: 'good' | 'near' | 'miss' }) {
  return (
    <span className={`code__peg${color === null ? ' is-empty' : ` echo__pad--${color}`}${hint ? ` is-${hint}` : ''}`}>
      {color !== null && <EchoShape color={color} />}
      {hint === 'good' && <span className="code__hint">✓</span>}
      {hint === 'near' && <span className="code__hint">•</span>}
    </span>
  );
}

/** Une ligne d'essai, avec ses indices (sous chaque pion, ou comptés à droite). */
export function CodeRow({ c, secret, guess, done }: { c: CodeLevel; secret: readonly number[]; guess: readonly (number | null)[]; done: boolean }) {
  const full = guess.every((g) => g !== null) && done;
  const hints = full && c.hints === 'pegs' ? pegHints(secret, guess as number[]) : null;
  const counts = full && c.hints === 'counts' ? hintCounts(secret, guess as number[]) : null;
  return (
    <li className={`code__row${done ? '' : ' is-current'}`}>
      <span className="code__pegs">
        {guess.map((g, i) => (
          <Peg key={i} color={g} hint={hints?.[i]} />
        ))}
      </span>
      {counts && (
        <span className="code__counts" aria-label={tr(`${counts.good} bien placés, ${counts.near} mal placés`, `${counts.good} right place, ${counts.near} wrong place`)}>
          <span>● {counts.good}</span>
          <span>○ {counts.near}</span>
        </span>
      )}
    </li>
  );
}

export function CodeGame({ seed, level, onFinish }: GameProps) {
  const c = codeLevel(level);
  const codes = useMemo(() => generateCodes(createRng(seed), level), [seed, level]);
  const [clock] = useState(() => new GameClock());
  const [index, setIndex] = useState(0);
  const [guesses, setGuesses] = useState<number[][]>([]);
  const [current, setCurrent] = useState<number[]>([]);
  const [results, setResults] = useState<(number | null)[]>([]);
  const [reveal, setReveal] = useState(false);
  const [over, setOver] = useState(false);
  const ended = useRef(false);
  const [mark, showMark] = useFeedback();
  const secret = codes[Math.min(index, codes.length - 1)];

  const finish = (final: (number | null)[]) => {
    if (ended.current) return;
    ended.current = true;
    setOver(true);
    clock.stop();
    const solved = final.filter((r) => r !== null) as number[];
    onFinish({
      score: scoreCode(final, level),
      stats: { solved: solved.length, codes: c.codes },
      headline: tr(byCount(solved.length, `${solved.length} code sur ${c.codes}`, `${solved.length} codes sur ${c.codes}`), `${solved.length} of ${c.codes} codes`),
      lines: [
        ...Array.from({ length: c.codes }, (_, i) => ({
          label: tr(`Code ${i + 1}`, `Code ${i + 1}`),
          value: final[i] ? tr(`${final[i]} essais · ${codePoints(final[i], level)} pts`, `${final[i]} tries · ${codePoints(final[i], level)} pts`) : tr('Pas trouvé', 'Not cracked'),
        })),
      ],
    });
  };

  const timeUp = useEffectEvent(() => finish(results));

  useEffect(() => {
    clock.start();
    const id = window.setInterval(() => {
      if (clock.total() >= CODE_DURATION_MS) {
        window.clearInterval(id);
        timeUp();
      }
    }, 100);
    return () => {
      window.clearInterval(id);
      clock.stop();
    };
  }, [clock]);

  const pick = (color: number) => {
    if (over || reveal || current.length >= c.pegs) return;
    fx.note(color);
    setCurrent([...current, color]);
  };

  const erase = () => {
    if (over || reveal || !current.length) return;
    fx.tap();
    setCurrent(current.slice(0, -1));
  };

  const submit = () => {
    if (over || reveal || current.length < c.pegs) return;
    const all = [...guesses, current];
    setGuesses(all);
    setCurrent([]);
    const cracked = current.every((v, i) => v === secret[i]);
    if (!cracked && all.length < c.tries) {
      fx.tap();
      return;
    }
    const nextResults = [...results, cracked ? all.length : null];
    setResults(nextResults);
    if (cracked) {
      fx.good();
      showMark('good');
    } else {
      fx.bad();
      showMark('bad', tr('Pas trouvé', 'Not cracked'));
    }
    // Le code se montre un instant, puis le suivant.
    setReveal(true);
    window.setTimeout(
      () => {
        if (ended.current) return;
        if (nextResults.length >= c.codes) {
          finish(nextResults);
          return;
        }
        setReveal(false);
        setGuesses([]);
        setIndex(index + 1);
      },
      slow(cracked ? 700 : 1400),
    );
  };

  const rows = [...guesses.map((g) => ({ guess: g, done: true }))];
  if (!reveal && rows.length < c.tries) rows.push({ guess: [...current, ...Array<null>(c.pegs - current.length).fill(null)] as number[], done: false });

  return (
    <div className="game">
      <GameHud>
        <TimeLeft clock={clock} durationMs={CODE_DURATION_MS} />
      </GameHud>
      <div className="game__stage code">
        <p className="anagram__found">
          {tr('Code', 'Code')} <strong>{Math.min(index + 1, c.codes)}</strong> / {c.codes} · {tr(`essai ${Math.min(guesses.length + 1, c.tries)} / ${c.tries}`, `try ${Math.min(guesses.length + 1, c.tries)} / ${c.tries}`)}
        </p>
        <ol className={`code__board code__board--${c.pegs}`} aria-label={tr('Tes essais', 'Your tries')}>
          {rows.map((row, i) => (
            <CodeRow key={i} c={c} secret={secret} guess={row.guess} done={row.done} />
          ))}
        </ol>
        {reveal && (
          <p className="code__secret">
            {tr('Le code', 'The code')}
            <span className="code__pegs">
              {secret.map((v, i) => (
                <Peg key={i} color={v} />
              ))}
            </span>
          </p>
        )}
        <FeedbackMark mark={mark} />
      </div>
      <div className="game__controls code__controls">
        <div className="code__palette" role="group" aria-label={tr('Les couleurs', 'The colors')}>
          {Array.from({ length: c.colors }, (_, color) => (
            <TapButton key={color} className={`code__color echo__pad--${color}`} onTap={() => pick(color)} disabled={over || reveal || current.length >= c.pegs}>
              <EchoShape color={color} />
            </TapButton>
          ))}
        </div>
        <div className="code__keys">
          <TapButton className="numpad__key numpad__key--muted" onTap={erase} aria-label={tr('Effacer', 'Erase')} disabled={over || reveal || !current.length}>
            <Icon name="erase" size={26} />
          </TapButton>
          <TapButton className="numpad__key numpad__key--ok" onTap={submit} disabled={over || reveal || current.length < c.pegs}>
            OK
          </TapButton>
        </div>
      </div>
    </div>
  );
}
