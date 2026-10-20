import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { CharacterId } from '../../core/characters';
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  PARTY_ROUNDS,
  partyQuestion,
  partyRanking,
  QUESTION_TIME_MS,
  QUESTIONS_PER_ROUND,
  type PartyPlayer,
  type PartyQuestion,
} from '../../core/party';
import { byCount } from '../../core/format';
import { tr } from '../../core/lang';
import { randomSeed } from '../../core/rng';
import { Icon } from '../components/Icon';
import { Mascot } from '../components/Mascot';
import { TapButton } from '../components/TapButton';
import { fx } from '../fx/fx';
import { startMusic, stopMusic } from '../fx/music';
import { navigate } from '../router';

type Phase = 'setup' | 'round' | 'question' | 'reveal' | 'results';

/** Chaque place a son compagnon et sa couleur, pour se repérer d'un coup d'œil. */
const SEATS: { character: CharacterId; color: number }[] = [
  { character: 'pomme', color: 0 },
  { character: 'citron', color: 3 },
  { character: 'raisin', color: 2 },
  { character: 'orange', color: 4 },
];

const INKS: Record<string, string> = {
  rouge: 'var(--ink-rouge)',
  bleu: 'var(--ink-bleu)',
  vert: 'var(--ink-vert)',
  jaune: 'var(--ink-jaune)',
  orange: 'var(--ink-orange)',
  violet: 'var(--ink-violet)',
};

export function PartyScreen() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [count, setCount] = useState(2);
  const [names, setNames] = useState(['', '', '', '']);
  const [players, setPlayers] = useState<PartyPlayer[]>([]);
  const [seed, setSeed] = useState(0);
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [frozen, setFrozen] = useState<ReadonlySet<number>>(new Set());
  const [winner, setWinner] = useState<number | null>(null);
  const question = useMemo(() => partyQuestion(seed, round, index), [seed, round, index]);
  const playing = phase === 'round' || phase === 'question' || phase === 'reveal';

  const start = () => {
    setPlayers(Array.from({ length: count }, (_, i) => ({ name: names[i].trim() || tr(`Joueur ${i + 1}`, `Player ${i + 1}`), color: SEATS[i].color, score: 0 })));
    setSeed(randomSeed());
    setRound(0);
    setIndex(0);
    setFrozen(new Set());
    setWinner(null);
    setPhase('round');
  };

  // La musique de la fête, le temps de la partie.
  useEffect(() => {
    if (!playing) return;
    startMusic('vitesse');
    return () => stopMusic();
  }, [playing]);

  // Le déroulé : annonce de manche, question (avec un temps limite), révélation, suite.
  useEffect(() => {
    if (phase === 'round') {
      const id = window.setTimeout(() => setPhase('question'), 2200);
      return () => window.clearTimeout(id);
    }
    if (phase === 'question') {
      const id = window.setTimeout(() => setPhase('reveal'), QUESTION_TIME_MS);
      return () => window.clearTimeout(id);
    }
    if (phase === 'reveal') {
      const id = window.setTimeout(() => {
        setFrozen(new Set());
        setWinner(null);
        if (index + 1 < QUESTIONS_PER_ROUND) {
          setIndex(index + 1);
          setPhase('question');
        } else if (round + 1 < PARTY_ROUNDS.length) {
          setRound(round + 1);
          setIndex(0);
          setPhase('round');
        } else {
          fx.record();
          setPhase('results');
        }
      }, 1300);
      return () => window.clearTimeout(id);
    }
  }, [phase, index, round]);

  const answer = (player: number, option: number) => {
    if (phase !== 'question' || frozen.has(player)) return;
    if (option === question.answer) {
      fx.good();
      setWinner(player);
      setPlayers(players.map((p, i) => (i === player ? { ...p, score: p.score + 1 } : p)));
      setPhase('reveal');
    } else {
      fx.bad();
      const next = new Set([...frozen, player]);
      setFrozen(next);
      if (next.size >= players.length) setPhase('reveal');
    }
  };

  if (phase === 'setup') {
    return (
      <div className="screen screen-in mode-screen">
        <header className="intro__top">
          <button type="button" className="icon-btn" onClick={() => navigate({ name: 'training' }, { replace: true })} aria-label={tr('Retour', 'Back')}>
            <Icon name="back" />
          </button>
        </header>
        <div className="intro__head">
          <h1 className="intro__title">{tr('Mode fête', 'Party mode')}</h1>
          <p className="intro__rule">
            {tr(
              'Jusqu’à 4 joueurs en même temps, chacun de son côté de l’écran. Le premier qui répond juste marque le point ; une erreur te gèle jusqu’à la question suivante. Cinq manches, idéal sur une tablette posée à plat.',
              'Up to 4 players at once, each on their own side of the screen. The first to answer correctly scores the point; a wrong answer freezes you until the next question. Five rounds, perfect on a tablet lying flat.',
            )}
          </p>
        </div>
        <div className="field">
          <span className="field__label" id="party-count">
            {tr('Nombre de joueurs', 'Number of players')}
          </span>
          <div className="segmented" role="radiogroup" aria-labelledby="party-count">
            {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => i + MIN_PLAYERS).map((n) => (
              <button key={n} type="button" role="radio" aria-checked={count === n} className="segmented__option" onClick={() => setCount(n)}>
                {tr(`${n} joueurs`, `${n} players`)}
              </button>
            ))}
          </div>
        </div>
        <div className="party-seats">
          {Array.from({ length: count }, (_, i) => (
            <label key={i} className="party-seat">
              <span className={`avatar avatar--c${SEATS[i].color}`} style={{ width: 52, height: 52 }} aria-hidden="true">
                <Mascot character={SEATS[i].character} mood="happy" size={48} still />
              </span>
              <input
                className="field__input"
                value={names[i]}
                maxLength={12}
                placeholder={tr(`Joueur ${i + 1}`, `Player ${i + 1}`)}
                aria-label={tr(`Prénom du joueur ${i + 1}`, `Player ${i + 1}’s name`)}
                onChange={(e) => setNames(names.map((n, k) => (k === i ? e.target.value : n)))}
              />
            </label>
          ))}
        </div>
        <button type="button" className="cta mode-cta" onClick={start}>
          <span className="cta__text">
            <span className="cta__label">{tr('Lancer la fête', 'Start the party')}</span>
            <span className="cta__sub">{tr('5 manches · environ 5 minutes', '5 rounds · about 5 minutes')}</span>
          </span>
          <span className="cta__icon">
            <Icon name="play" />
          </span>
        </button>
      </div>
    );
  }

  if (phase === 'results') {
    const ranking = partyRanking(players);
    return (
      <div className="screen screen-in mode-screen party-results">
        <div className="intro__head duel-final">
          <Mascot character={SEATS[players.indexOf(ranking[0].player)].character} mood="cheer" size={120} />
          <h1 className="intro__title">
            {ranking.filter((r) => r.rank === 1).length > 1
              ? tr('Égalité au sommet !', 'A tie at the top!')
              : tr(`${ranking[0].player.name} gagne la fête !`, `${ranking[0].player.name} wins the party!`)}
          </h1>
        </div>
        <ol className="mode-list">
          {ranking.map(({ player, rank }) => (
            <li key={player.name} className={`mode-item${rank === 1 ? ' is-done' : ''}`}>
              <span className="mode-item__rank">{rank}</span>
              <span className={`avatar avatar--c${player.color}`} style={{ width: 44, height: 44 }} aria-hidden="true">
                <Mascot character={SEATS[players.indexOf(player)].character} mood={rank === 1 ? 'cheer' : 'happy'} size={40} still />
              </span>
              <span className="mode-item__text">
                <span className="mode-item__name">{player.name}</span>
              </span>
              <span className="mode-item__score">
                {tr(byCount(player.score, `${player.score} point`, `${player.score} points`), byCount(player.score, `${player.score} point`, `${player.score} points`))}
              </span>
            </li>
          ))}
        </ol>
        <div className="mode-actions">
          <button type="button" className="btn btn--primary btn--lg" onClick={start} autoFocus>
            <Icon name="replay" />
            {tr('Revanche', 'Rematch')}
          </button>
          <button type="button" className="btn btn--lg btn--ghost" onClick={() => setPhase('setup')}>
            {tr('Changer les joueurs', 'Change players')}
          </button>
        </div>
      </div>
    );
  }

  const roundInfo = PARTY_ROUNDS[round];
  return (
    <div className={`party party--${players.length}`}>
      {players.map((player, i) => (
        <PartyZone
          key={i}
          seat={i}
          count={players.length}
          player={player}
          question={question}
          intro={phase === 'round' ? roundInfo : null}
          frozen={frozen.has(i)}
          state={winner === null ? (phase === 'reveal' ? 'reveal' : 'live') : winner === i ? 'won' : 'lost'}
          winnerName={winner !== null ? players[winner].name : null}
          onAnswer={(option) => answer(i, option)}
        />
      ))}
      {players.length === 3 && (
        <div className="party-board">
          <p className="party-board__round">{roundInfo.title}</p>
          {players.map((p, i) => (
            <p key={i} className="party-board__row">
              <span>{p.name}</span>
              <strong>{p.score}</strong>
            </p>
          ))}
        </div>
      )}
      <div className="party-bar">
        <button type="button" className="icon-btn" onClick={() => setPhase('setup')} aria-label={tr('Arrêter la fête', 'Stop the party')}>
          <Icon name="close" />
        </button>
        <span>
          {tr(
            `Manche ${round + 1}/${PARTY_ROUNDS.length} · ${Math.min(index + 1, QUESTIONS_PER_ROUND)}/${QUESTIONS_PER_ROUND}`,
            `Round ${round + 1}/${PARTY_ROUNDS.length} · ${Math.min(index + 1, QUESTIONS_PER_ROUND)}/${QUESTIONS_PER_ROUND}`,
          )}
        </span>
      </div>
    </div>
  );
}

interface ZoneProps {
  seat: number;
  count: number;
  player: PartyPlayer;
  question: PartyQuestion;
  intro: { title: string; rule: string } | null;
  frozen: boolean;
  state: 'live' | 'won' | 'lost' | 'reveal';
  winnerName: string | null;
  onAnswer: (option: number) => void;
}

/** La zone d'un joueur, tournée vers lui (celles du haut sont à l'envers). */
function PartyZone({ seat, count, player, question, intro, frozen, state, winnerName, onAnswer }: ZoneProps) {
  const flipped = count === 2 ? seat === 0 : seat < 2;
  return (
    <section
      className={`party-zone avatar-tint--c${player.color}${flipped ? ' is-flipped' : ''}${frozen ? ' is-frozen' : ''} is-${state}`}
      aria-label={tr(`Zone de ${player.name}`, `${player.name}’s area`)}
    >
      <header className="party-zone__head">
        <span className={`avatar avatar--c${player.color}`} style={{ width: 40, height: 40 }} aria-hidden="true">
          <Mascot character={SEATS[seat].character} mood={state === 'won' ? 'cheer' : frozen ? 'gentle' : 'happy'} size={36} still />
        </span>
        <span className="party-zone__name">{player.name}</span>
        <span className="party-zone__score">{player.score}</span>
      </header>
      {intro ? (
        <div className="party-zone__intro">
          <p className="party-zone__title">{intro.title}</p>
          <p className="party-zone__rule">{intro.rule}</p>
        </div>
      ) : (
        <>
          <div className="party-zone__question">
            {question.kind === 'couleur' ? (
              <span className="party-zone__word" style={{ color: INKS[question.ink ?? 'rouge'] } as CSSProperties}>
                {question.text}
              </span>
            ) : question.kind === 'combien' ? (
              <span className="party-dots" aria-label={question.text}>
                {Array.from({ length: 25 }, (_, k) => (
                  <span key={k} className={question.dots?.includes(k) ? 'is-on' : undefined} />
                ))}
              </span>
            ) : (
              <span className="party-zone__text">{question.text}</span>
            )}
          </div>
          <div className={`party-zone__options party-zone__options--${question.options.length}`}>
            {question.options.map((option, k) => (
              <TapButton
                key={k}
                className={`party-option${option.color ? ' party-option--color' : ''}${state !== 'live' && k === question.answer ? ' is-answer' : ''}`}
                style={option.color ? ({ background: INKS[option.color] } as CSSProperties) : undefined}
                onTap={() => onAnswer(k)}
                disabled={frozen || state !== 'live'}
                aria-label={option.color ? option.label : undefined}
              >
                {option.color ? '' : option.label}
              </TapButton>
            ))}
          </div>
          <p className="party-zone__status" aria-live="polite">
            {state === 'won'
              ? tr('Bravo, le point est pour toi !', 'Nice, the point is yours!')
              : state === 'lost'
                ? tr(`${winnerName} a été plus rapide`, `${winnerName} was faster`)
                : frozen
                  ? tr('Raté ! Attends la suivante', 'Missed! Wait for the next one')
                  : ' '}
          </p>
        </>
      )}
    </section>
  );
}
