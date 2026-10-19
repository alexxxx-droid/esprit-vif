import { useMemo, useState } from 'react';
import { nbackLevel, tutorialTrials } from '../../core/games/nback';
import { lang, tr } from '../../core/lang';
import { Icon } from '../components/Icon';
import { Mascot } from '../components/Mascot';
import { fx } from '../fx/fx';
import type { TutorialProps } from '../game/chrome';

/** Combien d'essais avec l'aide entourée, puis avec l'historique seul ; ensuite, sans rien. */
const OUTLINED = 3;
const WITH_HISTORY = 6;

const coups = (n: number) => tr(n === 1 ? 'au coup d’avant' : `il y a ${n} coups`, n === 1 ? 'one turn ago' : `${n} turns ago`);

function Item({ value, channel, size = 'big' }: { value: string | number; channel: 'letter' | 'position'; size?: 'big' | 'small' }) {
  if (channel === 'letter') return <span className={`tuto-letter tuto-letter--${size}`}>{value}</span>;
  return (
    <span className={`tuto-grid tuto-grid--${size}`} aria-label={tr(`case ${Number(value) + 1}`, `square ${Number(value) + 1}`)}>
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
  const thing = channel === 'letter' ? tr('lettre', 'letter') : tr('case allumée', 'lit square');
  const en = lang() === 'en';

  if (index < 0) {
    return (
      <div className="screen screen-in tuto">
        <div className="intro__head duel-final">
          <Mascot mood="think" size={96} />
          <h1 className="intro__title">{tr('Essai guidé', 'Guided practice')}</h1>
          {en ? (
            <p className="intro__rule">
              {channel === 'letter' ? 'Letters' : 'Squares'} will appear one at a time. Each time, ask yourself: is it the same {thing} as {coups(n)}?
              There’s no timer here: take your time.
            </p>
          ) : (
            <p className="intro__rule">
              Des {channel === 'letter' ? 'lettres' : 'cases'} vont apparaître une à une. À chaque fois, demande-toi&nbsp;: est-ce la même {thing} {coups(n)}&nbsp;?
              Ici, pas de chrono&nbsp;: prends ton temps.
            </p>
          )}
        </div>
        <button type="button" className="btn btn--primary btn--lg mode-cta" onClick={() => setIndex(0)} autoFocus>
          {tr('Commencer l’essai', 'Start the practice')}
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
          <h1 className="intro__title">{tr('Tu as compris le principe\u00a0!', 'You’ve got the idea!')}</h1>
          {en ? (
            <p className="intro__rule">
              {right} correct answer{right === 1 ? '' : 's'} out of {trials.values.length - n}. In the real game, everything moves on by itself, without
              waiting: tap the button <strong>only when it’s the same</strong>, otherwise do nothing.
              {config.n > 2 && ` At this level, it’s ${config.n} back: same idea, just further back.`}
              {config.mode === 'dual' && ' At this level, letters and squares at once: one button for each.'}
            </p>
          ) : (
            <p className="intro__rule">
              {right} bonne{right > 1 ? 's' : ''} réponse{right > 1 ? 's' : ''} sur {trials.values.length - n}. Pour de vrai, tout défile seul, sans attendre&nbsp;: touche le
              bouton <strong>seulement quand c’est pareil</strong>, sinon ne fais rien.
              {config.n > 2 && ` À ce niveau, c’est ${config.n} en arrière\u00a0: même principe, en remontant plus loin.`}
              {config.mode === 'dual' && ' À ce niveau, lettres et cases à la fois\u00a0: un bouton pour chacune.'}
            </p>
          )}
        </div>
        <div className="mode-actions">
          <button type="button" className="btn btn--primary btn--lg" onClick={() => onDone(true)} autoFocus>
            {tr('Jouer pour de vrai', 'Play for real')}
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
            {tr('Refaire l’essai', 'Practice again')}
          </button>
          <button type="button" className="btn btn--lg btn--ghost" onClick={() => onDone(false)}>
            {tr('Retour', 'Back')}
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
  const ago = coups(n);
  const Ago = ago.charAt(0).toUpperCase() + ago.slice(1);

  return (
    <div className="screen screen-in tuto">
      <header className="intro__top">
        <button type="button" className="icon-btn" onClick={() => onDone(false)} aria-label={tr('Quitter l’essai', 'Quit the practice')}>
          <Icon name="close" />
        </button>
        <span className="pill">{tr('Essai guidé', 'Guided practice')}</span>
      </header>
      <div className="tuto__stage">
        <div className={`tuto__history${showHistory ? '' : ' is-hidden'}`} aria-label={tr('Ce qui est passé', 'What came before')}>
          {showHistory &&
            history.map((v, i) => {
              const at = index - history.length + i;
              const isBack = !warmup && outline && at === index - n;
              return (
                <span key={at} className={`tuto__past${isBack ? ' is-back' : ''}`}>
                  <Item value={v} channel={channel} size="small" />
                  {isBack && <small>{ago}</small>}
                </span>
              );
            })}
          {!showHistory && <small>{tr('De mémoire, maintenant\u00a0!', 'From memory now!')}</small>}
        </div>
        <div key={index} className="tuto__current">
          <Item value={value} channel={channel} />
        </div>
        <p className="tuto__ask" aria-live="polite">
          {warmup
            ? tr(`Retiens-la, puis passe à la suivante.`, 'Remember it, then go on to the next one.')
            : answer === null
              ? tr(`Même ${thing} ${ago}\u00a0?`, `Same ${thing} as ${ago}?`)
              : answer === target
                ? tr(
                    `Oui\u00a0! ${Ago}, c’était ${channel === 'letter' ? back : 'cette case-là'}\u00a0: ${target ? 'pareil' : 'différent'}.`,
                    `Yes! ${Ago}, it was ${channel === 'letter' ? back : 'that square'}: ${target ? 'same' : 'different'}.`,
                  )
                : tr(
                    `Pas tout à fait\u00a0: ${ago}, c’était ${channel === 'letter' ? back : 'une autre case'}, donc ${target ? 'pareil' : 'différent'}.`,
                    `Not quite: ${ago}, it was ${channel === 'letter' ? back : 'another square'}, so ${target ? 'same' : 'different'}.`,
                  )}
          {answer !== null &&
            lure &&
            tr(
              ' (Piège\u00a0: c’est le coup d’avant qui est pareil, pas celui d’il y a 2\u00a0coups.)',
              ' (Trap: it’s the one just before that matches, not the one from 2 turns ago.)',
            )}
        </p>
      </div>
      <div className="tuto__buttons">
        {warmup || answer !== null ? (
          <button type="button" className="btn btn--primary btn--lg" onClick={next} autoFocus>
            {tr('Suivant', 'Next')}
            <Icon name="arrow" />
          </button>
        ) : (
          <>
            <button type="button" className="big-answer" onClick={() => choose(true)}>
              {tr('Pareil', 'Same')}
            </button>
            <button type="button" className="big-answer" onClick={() => choose(false)}>
              {tr('Différent', 'Different')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
