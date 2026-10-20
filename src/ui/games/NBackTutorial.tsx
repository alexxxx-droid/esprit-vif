import { useMemo, useState } from 'react';
import { nbackLevel, tutorialTrials } from '../../core/games/nback';
import { byCount } from '../../core/format';
import { tr } from '../../core/lang';
import { Icon } from '../components/Icon';
import { Mascot } from '../components/Mascot';
import { fx } from '../fx/fx';
import type { TutorialProps } from '../game/chrome';
import { rich } from '../rich';

/** Combien d'essais avec l'aide entourée, puis avec l'historique seul ; ensuite, sans rien. */
const OUTLINED = 3;
const WITH_HISTORY = 6;

const coups = (n: number) => tr(byCount(n, 'au coup d’avant', `il y a ${n} coups`), byCount(n, 'one turn ago', `${n} turns ago`));

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
  const letters = channel === 'letter';

  if (index < 0) {
    const ago = coups(n);
    return (
      <div className="screen screen-in tuto">
        <div className="intro__head duel-final">
          <Mascot mood="think" size={96} />
          <h1 className="intro__title">{tr('Essai guidé', 'Guided practice')}</h1>
          <p className="intro__rule">
            {letters
              ? tr(
                  `Des lettres vont apparaître une à une. À chaque fois, demande-toi\u00a0: est-ce la même lettre ${ago}\u00a0? Ici, pas de chrono\u00a0: prends ton temps.`,
                  `Letters will appear one at a time. Each time, ask yourself: is it the same letter as ${ago}? There’s no timer here: take your time.`,
                )
              : tr(
                  `Des cases vont apparaître une à une. À chaque fois, demande-toi\u00a0: est-ce la même case allumée ${ago}\u00a0? Ici, pas de chrono\u00a0: prends ton temps.`,
                  `Squares will appear one at a time. Each time, ask yourself: is it the same lit square as ${ago}? There’s no timer here: take your time.`,
                )}
          </p>
        </div>
        <button type="button" className="btn btn--primary btn--lg mode-cta" onClick={() => setIndex(0)} autoFocus>
          {tr('Commencer l’essai', 'Start the practice')}
          <Icon name="arrow" />
        </button>
      </div>
    );
  }

  if (index >= trials.values.length) {
    const total = trials.values.length - n;
    return (
      <div className="screen screen-in tuto">
        <div className="intro__head duel-final">
          <Mascot mood="cheer" size={96} />
          <h1 className="intro__title">{tr('Tu as compris le principe\u00a0!', 'You’ve got the idea!')}</h1>
          <p className="intro__rule">
            {tr(
              byCount(right, `${right} bonne réponse sur ${total}.`, `${right} bonnes réponses sur ${total}.`),
              byCount(right, `${right} correct answer out of ${total}.`, `${right} correct answers out of ${total}.`),
            )}{' '}
            {rich(
              tr(
                'Pour de vrai, tout défile seul, sans attendre\u00a0: touche le bouton {only}, sinon ne fais rien.',
                'In the real game, everything moves on by itself, without waiting: tap the button {only}, otherwise do nothing.',
              ),
              { only: <strong>{tr('seulement quand c’est pareil', 'only when it’s the same')}</strong> },
            )}
            {config.n > 2 &&
              tr(` À ce niveau, c’est ${config.n} en arrière\u00a0: même principe, en remontant plus loin.`, ` At this level, it’s ${config.n} back: same idea, just further back.`)}
            {config.mode === 'dual' && tr(' À ce niveau, lettres et cases à la fois\u00a0: un bouton pour chacune.', ' At this level, letters and squares at once: one button for each.')}
            {config.lures > 0 &&
              tr(' Gare aux pièges\u00a0: ce qui revient un coup trop tôt ou trop tard ne compte pas.', ' Watch out for traps: a repeat from one turn too early or too late doesn’t count.')}
          </p>
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
  const verdict = target ? tr('pareil', 'same') : tr('différent', 'different');
  const was = letters ? String(back) : tr('cette case-là', 'that square');
  const other = letters ? String(back) : tr('une autre case', 'another square');

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
              ? letters
                ? tr(`Même lettre ${ago}\u00a0?`, `Same letter as ${ago}?`)
                : tr(`Même case allumée ${ago}\u00a0?`, `Same lit square as ${ago}?`)
              : answer === target
                ? tr(`Oui\u00a0! ${Ago}, c’était ${was}\u00a0: ${verdict}.`, `Yes! ${Ago}, it was ${was}: ${verdict}.`)
                : tr(`Pas tout à fait\u00a0: ${ago}, c’était ${other}, donc ${verdict}.`, `Not quite: ${ago}, it was ${other}, so ${verdict}.`)}
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
