import { useMemo, useState } from 'react';
import { nbackLevel, tutorialTrials } from '../../core/games/nback';
import { Icon } from '../components/Icon';
import { Mascot } from '../components/Mascot';
import { fx } from '../fx/fx';
import type { TutorialProps } from '../game/chrome';

/** Combien d'essais avec l'aide entourée, puis avec l'historique seul ; ensuite, sans rien. */
const OUTLINED = 3;
const WITH_HISTORY = 6;

const coups = (n: number) => (n === 1 ? 'au coup d’avant' : `il y a ${n} coups`);

function Item({ value, channel, size = 'big' }: { value: string | number; channel: 'letter' | 'position'; size?: 'big' | 'small' }) {
  if (channel === 'letter') return <span className={`tuto-letter tuto-letter--${size}`}>{value}</span>;
  return (
    <span className={`tuto-grid tuto-grid--${size}`} aria-label={`case ${Number(value) + 1}`}>
      {Array.from({ length: 9 }, (_, cell) => (
        <span key={cell} className={cell === value ? 'is-lit' : undefined} />
      ))}
    </span>
  );
}

/** Essai guidé de Double retour : sans chrono, avec l'historique, puis l'aide s'efface. */
export function NBackTutorial({ level, onDone }: TutorialProps) {
  const config = nbackLevel(level);
  const n = Math.min(2, config.n) as 1 | 2;
  const channel = config.mode === 'position' ? 'position' : 'letter';
  const trials = useMemo(() => tutorialTrials(n, channel), [n, channel]);
  const [index, setIndex] = useState(-1);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [right, setRight] = useState(0);
  const thing = channel === 'letter' ? 'lettre' : 'case allumée';

  if (index < 0) {
    return (
      <div className="screen screen-in tuto">
        <div className="intro__head duel-final">
          <Mascot mood="think" size={96} />
          <h1 className="intro__title">Essai guidé</h1>
          <p className="intro__rule">
            Des {channel === 'letter' ? 'lettres' : 'cases'} vont apparaître une à une. À chaque fois, demande-toi&nbsp;: est-ce la même {thing} {coups(n)}&nbsp;?
            Ici, pas de chrono&nbsp;: prends ton temps.
          </p>
        </div>
        <button type="button" className="btn btn--primary btn--lg mode-cta" onClick={() => setIndex(0)} autoFocus>
          Commencer l’essai
          <Icon name="arrow" />
        </button>
      </div>
    );
  }

  if (index >= trials.values.length) {
    return (
      <div className="screen screen-in tuto">
        <div className="intro__head duel-final">
          <Mascot mood="cheer" size={96} />
          <h1 className="intro__title">Tu as compris le principe&nbsp;!</h1>
          <p className="intro__rule">
            {right} bonne{right > 1 ? 's' : ''} réponse{right > 1 ? 's' : ''} sur {trials.values.length - n}. Pour de vrai, tout défile seul, sans attendre&nbsp;: touche le
            bouton <strong>seulement quand c’est pareil</strong>, sinon ne fais rien.
            {config.n > 2 && ` À ce niveau, c’est ${config.n} en arrière\u00a0: même principe, en remontant plus loin.`}
            {config.mode === 'dual' && ' À ce niveau, lettres et cases à la fois\u00a0: un bouton pour chacune.'}
          </p>
        </div>
        <div className="mode-actions">
          <button type="button" className="btn btn--primary btn--lg" onClick={() => onDone(true)} autoFocus>
            Jouer pour de vrai
            <Icon name="play" />
          </button>
          <button
            type="button"
            className="btn btn--lg btn--ghost"
            onClick={() => {
              setIndex(-1);
              setRight(0);
              setAnswer(null);
            }}
          >
            Refaire l’essai
          </button>
          <button type="button" className="btn btn--lg btn--ghost" onClick={() => onDone(false)}>
            Retour
          </button>
        </div>
      </div>
    );
  }

  const value = trials.values[index];
  const warmup = index < n;
  const k = index - n;
  const target = trials.targets[index];
  const back = trials.values[index - n];
  const showHistory = k < WITH_HISTORY;
  const outline = k < OUTLINED;
  const history = trials.values.slice(Math.max(0, index - 4), index);
  const next = () => {
    setAnswer(null);
    setIndex(index + 1);
  };
  const choose = (same: boolean) => {
    if (answer !== null) return;
    setAnswer(same);
    if (same === target) {
      fx.good();
      setRight(right + 1);
    } else fx.bad();
  };
  const lure = n === 2 && !target && value === trials.values[index - 1];

  return (
    <div className="screen screen-in tuto">
      <header className="intro__top">
        <button type="button" className="icon-btn" onClick={() => onDone(false)} aria-label="Quitter l’essai">
          <Icon name="close" />
        </button>
        <span className="pill">Essai guidé</span>
      </header>
      <div className="tuto__stage">
        <div className={`tuto__history${showHistory ? '' : ' is-hidden'}`} aria-label="Ce qui est passé">
          {showHistory &&
            history.map((v, i) => {
              const at = index - history.length + i;
              const isBack = !warmup && outline && at === index - n;
              return (
                <span key={at} className={`tuto__past${isBack ? ' is-back' : ''}`}>
                  <Item value={v} channel={channel} size="small" />
                  {isBack && <small>{coups(n)}</small>}
                </span>
              );
            })}
          {!showHistory && <small>De mémoire, maintenant&nbsp;!</small>}
        </div>
        <div key={index} className="tuto__current">
          <Item value={value} channel={channel} />
        </div>
        <p className="tuto__ask" aria-live="polite">
          {warmup
            ? `Retiens-la, puis passe à la suivante.`
            : answer === null
              ? `Même ${thing} ${coups(n)}\u00a0?`
              : answer === target
                ? `Oui\u00a0! ${coups(n).charAt(0).toUpperCase() + coups(n).slice(1)}, c’était ${channel === 'letter' ? back : 'cette case-là'}\u00a0: ${target ? 'pareil' : 'différent'}.`
                : `Pas tout à fait\u00a0: ${coups(n)}, c’était ${channel === 'letter' ? back : 'une autre case'}, donc ${target ? 'pareil' : 'différent'}.`}
          {answer !== null && lure && ' (Piège\u00a0: c’est le coup d’avant qui est pareil, pas celui d’il y a 2\u00a0coups.)'}
        </p>
      </div>
      <div className="tuto__buttons">
        {warmup || answer !== null ? (
          <button type="button" className="btn btn--primary btn--lg" onClick={next} autoFocus>
            Suivant
            <Icon name="arrow" />
          </button>
        ) : (
          <>
            <button type="button" className="big-answer" onClick={() => choose(true)}>
              Pareil
            </button>
            <button type="button" className="big-answer" onClick={() => choose(false)}>
              Différent
            </button>
          </>
        )}
      </div>
    </div>
  );
}
