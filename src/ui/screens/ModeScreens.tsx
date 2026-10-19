import { useCallback, useMemo, useState } from 'react';
import { plural } from '../../core/format';
import { DOMAIN_ORDER, DOMAINS, GAMES } from '../../core/games/registry';
import {
  DUEL_DIFFICULTIES,
  DUEL_ROUNDS,
  duelRounds,
  duelWinner,
  marathonGames,
  roundWinner,
  SESSION_REASONS,
  sessionDone,
  sessionGames,
  type DuelDifficulty,
  type DuelRound,
} from '../../core/modes';
import { randomSeed } from '../../core/rng';
import type { Domain, GameId } from '../../core/types';
import { gameLevel } from '../../store/progress';
import { DomainBadge } from '../components/bits';
import { Icon } from '../components/Icon';
import { GameRunner } from '../game/GameRunner';
import { useToday } from '../hooks';
import { useProgress, useStore } from '../progress-context';
import { navigate } from '../router';

function ModeHeader({ onBack, badge }: { onBack: () => void; badge?: string }) {
  return (
    <header className="intro__top">
      <button type="button" className="icon-btn" onClick={onBack} aria-label="Retour">
        <Icon name="back" />
      </button>
      {badge && <span className="pill">{badge}</span>}
    </header>
  );
}

/* ---------- Séance du jour sur mesure ---------- */

export function SessionScreen() {
  const data = useProgress();
  const store = useStore();
  const today = useToday();
  const picks = useMemo(() => sessionGames(today, data.plays), [today, data.plays]);
  const done = sessionDone(picks, data.plays, today);
  const completed = data.extras.sessions.includes(today);
  const [playing, setPlaying] = useState<GameId | null>(null);
  const back = () => setPlaying(null);
  const pending = picks.filter((p) => !done.has(p.gameId));

  if (playing) {
    const position = picks.findIndex((p) => p.gameId === playing) + 1;
    const next = pending.find((p) => p.gameId !== playing);
    return (
      <GameRunner
        key={playing}
        meta={GAMES[playing]}
        level={gameLevel(data, playing)}
        mode="free"
        badge={`Séance du jour · ${position}/${picks.length}`}
        save={async (outcome, run) => {
          const saved = await store.recordPlay({ gameId: playing, level: run.level, mode: 'free', seed: run.seed, outcome });
          const nowDone = sessionDone(picks, store.getSnapshot().plays, today);
          if (picks.every((p) => nowDone.has(p.gameId))) await store.completeSession(today);
          return saved;
        }}
        actions={() =>
          next ? (
            <button type="button" className="btn btn--primary btn--lg" onClick={() => setPlaying(next.gameId)} autoFocus>
              Jeu suivant : {GAMES[next.gameId].name}
              <Icon name="arrow" />
            </button>
          ) : (
            <button type="button" className="btn btn--primary btn--lg" onClick={back} autoFocus>
              Terminer la séance
              <Icon name="check" />
            </button>
          )
        }
        onQuit={back}
      />
    );
  }

  return (
    <div className="screen screen-in mode-screen">
      <ModeHeader onBack={() => navigate({ name: 'home' }, { replace: true })} badge="≈ 6 minutes" />
      <div className="intro__head">
        <h1 className="intro__title">Séance du jour</h1>
        <p className="intro__rule">Quatre jeux choisis pour toi : tes domaines les plus fragiles d’abord, puis de quoi varier. Chacun à ton niveau.</p>
      </div>
      <ol className="mode-list">
        {picks.map((pick) => (
          <li key={pick.gameId} className={`mode-item${done.has(pick.gameId) ? ' is-done' : ''}`}>
            <DomainBadge domain={pick.domain} />
            <span className="mode-item__text">
              <span className="mode-item__name">{GAMES[pick.gameId].name}</span>
              <span className="mode-item__sub">
                {DOMAINS[pick.domain].name} · niveau {gameLevel(data, pick.gameId)}
              </span>
            </span>
            {done.has(pick.gameId) ? (
              <span className="mode-item__check" aria-label="Fait">
                <Icon name="check" size={18} strokeWidth={3} />
              </span>
            ) : (
              <span className={`reason reason--${pick.reason}`}>{SESSION_REASONS[pick.reason]}</span>
            )}
          </li>
        ))}
      </ol>
      {completed ? (
        <>
          <p className="badge badge--record mode-done">
            <Icon name="check" size={18} />
            Séance terminée&nbsp;! <span className="badge__aside">+30 XP · à demain</span>
          </p>
          <button type="button" className="btn btn--lg mode-cta" onClick={() => navigate({ name: 'home' }, { replace: true })}>
            Retour à l’accueil
          </button>
        </>
      ) : (
        <button type="button" className="cta mode-cta" onClick={() => setPlaying(pending[0].gameId)} autoFocus>
          <span className="cta__text">
            <span className="cta__label">{done.size ? 'Continuer la séance' : 'Commencer'}</span>
            <span className="cta__sub">
              {done.size ? `${done.size} jeu${done.size > 1 ? 'x' : ''} sur ${picks.length} · ` : ''}
              {GAMES[pending[0].gameId].name}
            </span>
          </span>
          <span className="cta__icon">
            <Icon name="play" />
          </span>
        </button>
      )}
    </div>
  );
}

/* ---------- Marathon ---------- */

export function MarathonScreen({ domain }: { domain: Domain | null }) {
  return domain ? <MarathonRun key={domain} domain={domain} /> : <MarathonPicker />;
}

function MarathonPicker() {
  const data = useProgress();
  return (
    <div className="screen screen-in mode-screen">
      <ModeHeader onBack={() => navigate({ name: 'training' }, { replace: true })} />
      <div className="intro__head">
        <h1 className="intro__title">Marathon</h1>
        <p className="intro__rule">Tous les jeux d’un domaine à la suite, chacun à ton niveau. Les scores s’additionnent : bats ton record&nbsp;!</p>
      </div>
      <div className="mode-list">
        {DOMAIN_ORDER.map((domain) => {
          const games = marathonGames(domain);
          const record = data.extras.marathons[domain];
          return (
            <button key={domain} type="button" className="mode-item mode-item--button" onClick={() => navigate({ name: 'marathon', domain })}>
              <DomainBadge domain={domain} />
              <span className="mode-item__text">
                <span className="mode-item__name">{DOMAINS[domain].name}</span>
                <span className="mode-item__sub">
                  {plural(games.length, 'jeu', 'jeux')} · {record ? `record ${record.best} / ${games.length * 100}` : 'pas encore couru'}
                </span>
              </span>
              <Icon name="arrow" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MarathonRun({ domain }: { domain: Domain }) {
  const data = useProgress();
  const store = useStore();
  const games = marathonGames(domain);
  const [scores, setScores] = useState<number[]>([]);
  const [playing, setPlaying] = useState<number | null>(null);
  const [finished, setFinished] = useState<{ total: number; record: boolean; first: boolean } | null>(null);
  const best = data.extras.marathons[domain]?.best;
  const total = scores.reduce((sum, s) => sum + s, 0);
  const restart = () => {
    setScores([]);
    setFinished(null);
    setPlaying(0);
  };

  if (playing !== null) {
    const gameId = games[playing];
    const last = playing === games.length - 1;
    return (
      <GameRunner
        key={playing}
        meta={GAMES[gameId]}
        level={gameLevel(data, gameId)}
        mode="free"
        badge={`Marathon ${DOMAINS[domain].name} · ${playing + 1}/${games.length}`}
        save={async (outcome, run) => {
          const saved = await store.recordPlay({ gameId, level: run.level, mode: 'free', seed: run.seed, outcome });
          const next = [...scores.slice(0, playing), outcome.score];
          setScores(next);
          if (last) {
            const sum = next.reduce((s, x) => s + x, 0);
            const first = !store.getSnapshot().extras.marathons[domain];
            setFinished({ total: sum, record: await store.recordMarathon(domain, sum), first });
          }
          return saved;
        }}
        actions={() => (
          <button type="button" className="btn btn--primary btn--lg" onClick={() => setPlaying(last ? null : playing + 1)} autoFocus>
            {last ? 'Voir le bilan du marathon' : `Jeu suivant : ${GAMES[games[playing + 1]].name}`}
            <Icon name="arrow" />
          </button>
        )}
        onQuit={() => setPlaying(null)}
      />
    );
  }

  const max = games.length * 100;
  return (
    <div className="screen screen-in mode-screen">
      <ModeHeader onBack={() => navigate({ name: 'marathon', domain: null }, { replace: true })} badge={`≈ ${games.length + 1} minutes`} />
      <div className="intro__head">
        <span className="mode-domain">
          <DomainBadge domain={domain} size={26} />
          Marathon {DOMAINS[domain].name}
        </span>
        {finished ? (
          <>
            <h1 className="intro__title mode-total">
              {finished.total}
              <small> / {max}</small>
            </h1>
            {finished.first ? (
              <p className="intro__rule">Premier marathon dans ce domaine : ton record est posé, à toi de le battre.</p>
            ) : finished.record ? (
              <p className="badge badge--record">
                <Icon name="star" size={18} />
                Nouveau record&nbsp;!
              </p>
            ) : (
              <p className="intro__rule">Ton record reste à {best} points.</p>
            )}
          </>
        ) : (
          <p className="intro__rule">
            {plural(games.length, 'jeu', 'jeux')} à la suite, sans pause obligatoire. {best ? `Record à battre : ${best} / ${max}.` : 'Premier marathon : pose ton record !'}
          </p>
        )}
      </div>
      <ol className="mode-list">
        {games.map((gameId, i) => (
          <li key={gameId} className={`mode-item${scores[i] !== undefined ? ' is-done' : ''}`}>
            <span className="mode-item__rank">{i + 1}</span>
            <span className="mode-item__text">
              <span className="mode-item__name">{GAMES[gameId].name}</span>
              <span className="mode-item__sub">niveau {gameLevel(data, gameId)}</span>
            </span>
            {scores[i] !== undefined && <span className="mode-item__score">{scores[i]} pts</span>}
          </li>
        ))}
      </ol>
      {finished ? (
        <div className="mode-actions">
          <button type="button" className="btn btn--primary btn--lg" onClick={restart} autoFocus>
            <Icon name="replay" />
            Recommencer
          </button>
          <button type="button" className="btn btn--lg btn--ghost" onClick={() => navigate({ name: 'marathon', domain: null }, { replace: true })}>
            Autre domaine
          </button>
        </div>
      ) : (
        <button type="button" className="cta mode-cta" onClick={() => setPlaying(scores.length)} autoFocus>
          <span className="cta__text">
            <span className="cta__label">{scores.length ? 'Continuer' : 'C’est parti'}</span>
            <span className="cta__sub">{scores.length ? `${total} pts · jeu ${scores.length + 1} sur ${games.length}` : GAMES[games[0]].name}</span>
          </span>
          <span className="cta__icon">
            <Icon name="play" />
          </span>
        </button>
      )}
    </div>
  );
}

/* ---------- Duel à deux ---------- */

type DuelPhase = 'setup' | 'handoff' | 'play' | 'round' | 'final';
type RoundScores = [number | null, number | null];

export function DuelScreen() {
  const store = useStore();
  const [phase, setPhase] = useState<DuelPhase>('setup');
  const [names, setNames] = useState<[string, string]>(['', '']);
  const [difficulty, setDifficulty] = useState<DuelDifficulty>('facile');
  const [rounds, setRounds] = useState<DuelRound[]>([]);
  const [scores, setScores] = useState<RoundScores[]>([]);
  const [round, setRound] = useState(0);
  const [player, setPlayer] = useState<0 | 1>(0);
  const nameOf = (p: 0 | 1) => names[p].trim() || `Joueur ${p + 1}`;
  const level = DUEL_DIFFICULTIES[difficulty].level;
  const quitDuel = useCallback(() => setPhase('setup'), []);

  const start = () => {
    setRounds(duelRounds(randomSeed()));
    setScores(Array.from({ length: DUEL_ROUNDS }, () => [null, null]));
    setRound(0);
    setPlayer(0);
    setPhase('handoff');
  };

  const complete = scores.filter((s): s is [number, number] => s[0] !== null && s[1] !== null);

  if (phase === 'setup') {
    return (
      <div className="screen screen-in mode-screen">
        <ModeHeader onBack={() => navigate({ name: 'training' }, { replace: true })} />
        <div className="intro__head">
          <h1 className="intro__title">Duel à deux</h1>
          <p className="intro__rule">
            Trois manches sur le même téléphone. Chacun joue exactement la même partie, à tour de rôle : le meilleur score gagne la manche.
          </p>
        </div>
        <div className="duel-setup">
          {([0, 1] as const).map((p) => (
            <label key={p} className="field">
              <span className="field__label">Joueur {p + 1}</span>
              <input
                className="field__input"
                value={names[p]}
                maxLength={16}
                placeholder={`Joueur ${p + 1}`}
                onChange={(e) => setNames(p === 0 ? [e.target.value, names[1]] : [names[0], e.target.value])}
              />
            </label>
          ))}
          <div className="field">
            <span className="field__label" id="duel-difficulty">
              Difficulté
            </span>
            <div className="segmented duel-setup__levels" role="radiogroup" aria-labelledby="duel-difficulty">
              {(Object.keys(DUEL_DIFFICULTIES) as DuelDifficulty[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={difficulty === key}
                  className="segmented__option"
                  onClick={() => setDifficulty(key)}
                >
                  {DUEL_DIFFICULTIES[key].label}
                  <small>niveau {DUEL_DIFFICULTIES[key].level}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="mode-note">
          <Icon name="info" size={18} />
          Rien n’est enregistré dans tes progrès, à part le duel lui-même.
        </p>
        <button type="button" className="cta mode-cta" onClick={start}>
          <span className="cta__text">
            <span className="cta__label">Lancer le duel</span>
            <span className="cta__sub">3 manches · environ 6 minutes</span>
          </span>
          <span className="cta__icon">
            <Icon name="duel" />
          </span>
        </button>
      </div>
    );
  }

  const current = rounds[round];

  if (phase === 'handoff') {
    return (
      <div className="screen screen-in mode-screen duel-handoff">
        <ModeHeader onBack={quitDuel} badge={`Manche ${round + 1}/${DUEL_ROUNDS}`} />
        <div className="duel-handoff__body">
          <span className={`duel-avatar duel-avatar--${player}`}>{nameOf(player).charAt(0).toUpperCase()}</span>
          <h1 className="intro__title">À toi, {nameOf(player)}&nbsp;!</h1>
          <p className="intro__rule">
            {player === 0 ? `${nameOf(1)}, regarde ailleurs ! Au programme : ` : `${nameOf(0)} a fini son tour. La même partie t’attend : `}
            <strong>{GAMES[current.gameId].name}</strong>.
          </p>
        </div>
        <button type="button" className="cta mode-cta" onClick={() => setPhase('play')} autoFocus>
          <span className="cta__text">
            <span className="cta__label">Je suis prêt</span>
            <span className="cta__sub">{DOMAINS[GAMES[current.gameId].domain].name} · niveau {level}</span>
          </span>
          <span className="cta__icon">
            <Icon name="play" />
          </span>
        </button>
      </div>
    );
  }

  if (phase === 'play') {
    return (
      <GameRunner
        key={`${round}-${player}`}
        meta={GAMES[current.gameId]}
        level={level}
        mode="free"
        fixedSeed={current.seed}
        badge={`Duel · ${nameOf(player)} · manche ${round + 1}/${DUEL_ROUNDS}`}
        save={async (outcome) => {
          setScores((previous) => previous.map((s, i) => (i === round ? (player === 0 ? [outcome.score, s[1]] : [s[0], outcome.score]) : s)));
          return null;
        }}
        actions={() =>
          player === 0 ? (
            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={() => {
                setPlayer(1);
                setPhase('handoff');
              }}
              autoFocus
            >
              Au tour de {nameOf(1)}
              <Icon name="arrow" />
            </button>
          ) : (
            <button type="button" className="btn btn--primary btn--lg" onClick={() => setPhase('round')} autoFocus>
              Résultat de la manche
              <Icon name="arrow" />
            </button>
          )
        }
        onQuit={quitDuel}
      />
    );
  }

  const lastRound = round === DUEL_ROUNDS - 1;
  const wins = [0, 1].map((p) => complete.filter((s) => roundWinner(s) === p).length);

  if (phase === 'round') {
    const roundScores = scores[round] as [number, number];
    const winner = roundWinner(roundScores);
    return (
      <div className="screen screen-in mode-screen">
        <ModeHeader onBack={quitDuel} badge={`Manche ${round + 1}/${DUEL_ROUNDS}`} />
        <div className="intro__head">
          <p className="mode-item__sub">{GAMES[current.gameId].name}</p>
          <h1 className="intro__title">{winner === null ? 'Égalité !' : `${nameOf(winner)} gagne la manche !`}</h1>
        </div>
        <DuelBoard names={[nameOf(0), nameOf(1)]} scores={roundScores} highlight={winner} />
        <p className="mode-note">
          Manches gagnées : {nameOf(0)} {wins[0]} – {wins[1]} {nameOf(1)}
        </p>
        <button
          type="button"
          className="cta mode-cta"
          onClick={async () => {
            if (lastRound) {
              await store.recordDuel();
              setPhase('final');
            } else {
              setRound(round + 1);
              setPlayer(0);
              setPhase('handoff');
            }
          }}
          autoFocus
        >
          <span className="cta__text">
            <span className="cta__label">{lastRound ? 'Voir le vainqueur' : `Manche ${round + 2}`}</span>
            <span className="cta__sub">{lastRound ? 'Fin du duel' : `${nameOf(0)} commence`}</span>
          </span>
          <span className="cta__icon">
            <Icon name="arrow" />
          </span>
        </button>
      </div>
    );
  }

  const winner = duelWinner(complete);
  const totals: [number, number] = [complete.reduce((s, x) => s + x[0], 0), complete.reduce((s, x) => s + x[1], 0)];
  return (
    <div className="screen screen-in mode-screen">
      <ModeHeader onBack={() => navigate({ name: 'training' }, { replace: true })} badge="Fin du duel" />
      <div className="intro__head duel-final">
        {winner !== null && <span className={`duel-avatar duel-avatar--${winner} duel-avatar--big`}>{nameOf(winner).charAt(0).toUpperCase()}</span>}
        <h1 className="intro__title">{winner === null ? 'Égalité parfaite !' : `${nameOf(winner)} remporte le duel !`}</h1>
        <p className="intro__rule">
          {wins[0]} manche{wins[0] > 1 ? 's' : ''} à {wins[1]} · {totals[0]} contre {totals[1]} points au total
        </p>
      </div>
      <ol className="mode-list">
        {rounds.map((r, i) => {
          const s = scores[i] as [number, number];
          const w = roundWinner(s);
          return (
            <li key={i} className="mode-item">
              <span className="mode-item__rank">{i + 1}</span>
              <span className="mode-item__text">
                <span className="mode-item__name">{GAMES[r.gameId].name}</span>
                <span className="mode-item__sub">{w === null ? 'égalité' : `pour ${nameOf(w)}`}</span>
              </span>
              <span className="mode-item__score">
                {s[0]} – {s[1]}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mode-actions">
        <button type="button" className="btn btn--primary btn--lg" onClick={start} autoFocus>
          <Icon name="replay" />
          Revanche
        </button>
        <button type="button" className="btn btn--lg btn--ghost" onClick={() => navigate({ name: 'training' }, { replace: true })}>
          Terminer
        </button>
      </div>
    </div>
  );
}

function DuelBoard({ names, scores, highlight }: { names: [string, string]; scores: [number, number]; highlight: 0 | 1 | null }) {
  return (
    <div className="duel-board">
      {([0, 1] as const).map((p) => (
        <div key={p} className={`duel-board__side${highlight === p ? ' is-winner' : ''}`}>
          <span className={`duel-avatar duel-avatar--${p}`}>{names[p].charAt(0).toUpperCase()}</span>
          <span className="duel-board__name">{names[p]}</span>
          <span className="duel-board__score">{scores[p]}</span>
        </div>
      ))}
    </div>
  );
}
