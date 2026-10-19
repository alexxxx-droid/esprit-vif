import { useCallback, useMemo, useState } from 'react';
import { plural } from '../../core/format';
import { DOMAIN_ORDER, DOMAINS, GAMES } from '../../core/games/registry';
import { tr } from '../../core/lang';
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
import { GameArt } from '../components/GameArt';
import { Icon } from '../components/Icon';
import { GameRunner } from '../game/GameRunner';
import { useToday } from '../hooks';
import { useProgress, useStore } from '../progress-context';
import { navigate } from '../router';

function ModeHeader({ onBack, badge }: { onBack: () => void; badge?: string }) {
  return (
    <header className="intro__top">
      <button type="button" className="icon-btn" onClick={onBack} aria-label={tr('Retour', 'Back')}>
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
  const picks = useMemo(() => sessionGames(today, data.plays, data.settings.goals), [today, data.plays, data.settings.goals]);
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
        badge={tr(`Séance du jour · ${position}/${picks.length}`, `Daily session · ${position}/${picks.length}`)}
        save={async (outcome, run) => {
          const saved = await store.recordPlay({ gameId: playing, level: run.level, mode: 'free', seed: run.seed, outcome });
          const nowDone = sessionDone(picks, store.getSnapshot().plays, today);
          if (picks.every((p) => nowDone.has(p.gameId))) await store.completeSession(today);
          return saved;
        }}
        actions={() =>
          next ? (
            <button type="button" className="btn btn--primary btn--lg" onClick={() => setPlaying(next.gameId)} autoFocus>
              {tr(`Jeu suivant : ${GAMES[next.gameId].name}`, `Next game: ${GAMES[next.gameId].name}`)}
              <Icon name="arrow" />
            </button>
          ) : (
            <button type="button" className="btn btn--primary btn--lg" onClick={back} autoFocus>
              {tr('Terminer la séance', 'Finish the session')}
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
        <h1 className="intro__title">{tr('Séance du jour', 'Daily session')}</h1>
        <p className="intro__rule">
          {tr(
            'Quatre jeux choisis pour toi : tes domaines les plus fragiles d’abord, puis de quoi varier. Chacun à ton niveau.',
            'Four games picked for you: your weakest areas first, then some variety. Each one at your level.',
          )}
        </p>
      </div>
      <ol className="mode-list">
        {picks.map((pick) => (
          <li key={pick.gameId} className={`mode-item${done.has(pick.gameId) ? ' is-done' : ''}`}>
            <GameArt gameId={pick.gameId} size={44} />
            <span className="mode-item__text">
              <span className="mode-item__name">{GAMES[pick.gameId].name}</span>
              <span className="mode-item__sub">
                {tr(
                  `${DOMAINS[pick.domain].name} · niveau ${gameLevel(data, pick.gameId)}`,
                  `${DOMAINS[pick.domain].name} · level ${gameLevel(data, pick.gameId)}`,
                )}
              </span>
            </span>
            {done.has(pick.gameId) ? (
              <span className="mode-item__check" aria-label={tr('Fait', 'Done')}>
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
            {tr('Séance terminée\u00a0!', 'Session complete!')} <span className="badge__aside">{tr('+30 XP · à demain', '+30 XP · see you tomorrow')}</span>
          </p>
          <button type="button" className="btn btn--lg mode-cta" onClick={() => navigate({ name: 'home' }, { replace: true })}>
            {tr('Retour à l’accueil', 'Back to home')}
          </button>
        </>
      ) : (
        <button type="button" className="cta mode-cta" onClick={() => setPlaying(pending[0].gameId)} autoFocus>
          <span className="cta__text">
            <span className="cta__label">{done.size ? tr('Continuer la séance', 'Continue the session') : tr('Commencer', 'Start')}</span>
            <span className="cta__sub">
              {done.size ? tr(`${done.size} jeu${done.size > 1 ? 'x' : ''} sur ${picks.length} · `, `${done.size} of ${picks.length} games · `) : ''}
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
        <p className="intro__rule">
          {tr(
            'Tous les jeux d’un domaine à la suite, chacun à ton niveau. Les scores s’additionnent : bats ton record\u00a0!',
            'All the games in one area back to back, each at your level. The scores add up: beat your best!',
          )}
        </p>
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
                  {tr(plural(games.length, 'jeu', 'jeux'), plural(games.length, 'game'))} ·{' '}
                  {record
                    ? tr(`record ${record.best} / ${games.length * 100}`, `best ${record.best} / ${games.length * 100}`)
                    : tr('pas encore couru', 'not run yet')}
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
        badge={tr(`Marathon ${DOMAINS[domain].name} · ${playing + 1}/${games.length}`, `${DOMAINS[domain].name} marathon · ${playing + 1}/${games.length}`)}
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
            {last
              ? tr('Voir le bilan du marathon', 'See the marathon results')
              : tr(`Jeu suivant : ${GAMES[games[playing + 1]].name}`, `Next game: ${GAMES[games[playing + 1]].name}`)}
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
          {tr(`Marathon ${DOMAINS[domain].name}`, `${DOMAINS[domain].name} marathon`)}
        </span>
        {finished ? (
          <>
            <h1 className="intro__title mode-total">
              {finished.total}
              <small> / {max}</small>
            </h1>
            {finished.first ? (
              <p className="intro__rule">
                {tr(
                  'Premier marathon dans ce domaine : ton record est posé, à toi de le battre.',
                  'Your first marathon in this area: your best score is set, now go beat it.',
                )}
              </p>
            ) : finished.record ? (
              <p className="badge badge--record">
                <Icon name="star" size={18} />
                {tr('Nouveau record\u00a0!', 'New best!')}
              </p>
            ) : (
              <p className="intro__rule">{tr(`Ton record reste à ${best} points.`, `Your best is still ${best} points.`)}</p>
            )}
          </>
        ) : (
          <p className="intro__rule">
            {tr(
              `${plural(games.length, 'jeu', 'jeux')} à la suite, sans pause obligatoire. ${best ? `Record à battre : ${best} / ${max}.` : 'Premier marathon : pose ton record !'}`,
              `${plural(games.length, 'game')} back to back, no required breaks. ${best ? `Best to beat: ${best} / ${max}.` : 'First marathon: set your best score!'}`,
            )}
          </p>
        )}
      </div>
      <ol className="mode-list">
        {games.map((gameId, i) => (
          <li key={gameId} className={`mode-item${scores[i] !== undefined ? ' is-done' : ''}`}>
            <GameArt gameId={gameId} size={44} />
            <span className="mode-item__text">
              <span className="mode-item__name">
                {i + 1}. {GAMES[gameId].name}
              </span>
              <span className="mode-item__sub">{tr(`niveau ${gameLevel(data, gameId)}`, `level ${gameLevel(data, gameId)}`)}</span>
            </span>
            {scores[i] !== undefined && <span className="mode-item__score">{scores[i]} pts</span>}
          </li>
        ))}
      </ol>
      {finished ? (
        <div className="mode-actions">
          <button type="button" className="btn btn--primary btn--lg" onClick={restart} autoFocus>
            <Icon name="replay" />
            {tr('Recommencer', 'Play again')}
          </button>
          <button type="button" className="btn btn--lg btn--ghost" onClick={() => navigate({ name: 'marathon', domain: null }, { replace: true })}>
            {tr('Autre domaine', 'Another area')}
          </button>
        </div>
      ) : (
        <button type="button" className="cta mode-cta" onClick={() => setPlaying(scores.length)} autoFocus>
          <span className="cta__text">
            <span className="cta__label">{scores.length ? tr('Continuer', 'Continue') : tr('C’est parti', 'Let’s go')}</span>
            <span className="cta__sub">
              {scores.length
                ? tr(`${total} pts · jeu ${scores.length + 1} sur ${games.length}`, `${total} pts · game ${scores.length + 1} of ${games.length}`)
                : GAMES[games[0]].name}
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
  const defaultName = (p: 0 | 1) => tr(`Joueur ${p + 1}`, `Player ${p + 1}`);
  const nameOf = (p: 0 | 1) => names[p].trim() || defaultName(p);
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
          <h1 className="intro__title">{tr('Duel à deux', 'Two-player duel')}</h1>
          <p className="intro__rule">
            {tr(
              'Trois manches sur le même téléphone. Chacun joue exactement la même partie, à tour de rôle : le meilleur score gagne la manche.',
              'Three rounds on the same phone. You each play exactly the same game, taking turns: the best score wins the round.',
            )}
          </p>
        </div>
        <div className="duel-setup">
          {([0, 1] as const).map((p) => (
            <label key={p} className="field">
              <span className="field__label">{defaultName(p)}</span>
              <input
                className="field__input"
                value={names[p]}
                maxLength={16}
                placeholder={defaultName(p)}
                onChange={(e) => setNames(p === 0 ? [e.target.value, names[1]] : [names[0], e.target.value])}
              />
            </label>
          ))}
          <div className="field">
            <span className="field__label" id="duel-difficulty">
              {tr('Difficulté', 'Difficulty')}
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
                  <small>{tr(`niveau ${DUEL_DIFFICULTIES[key].level}`, `level ${DUEL_DIFFICULTIES[key].level}`)}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="mode-note">
          <Icon name="info" size={18} />
          {tr('Rien n’est enregistré dans tes progrès, à part le duel lui-même.', 'Nothing is saved to your progress, except the duel itself.')}
        </p>
        <button type="button" className="cta mode-cta" onClick={start}>
          <span className="cta__text">
            <span className="cta__label">{tr('Lancer le duel', 'Start the duel')}</span>
            <span className="cta__sub">{tr('3 manches · environ 6 minutes', '3 rounds · about 6 minutes')}</span>
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
        <ModeHeader onBack={quitDuel} badge={tr(`Manche ${round + 1}/${DUEL_ROUNDS}`, `Round ${round + 1}/${DUEL_ROUNDS}`)} />
        <div className="duel-handoff__body">
          <span className={`duel-avatar duel-avatar--${player}`}>{nameOf(player).charAt(0).toUpperCase()}</span>
          <h1 className="intro__title">{tr(`À toi, ${nameOf(player)}\u00a0!`, `Your turn, ${nameOf(player)}!`)}</h1>
          <p className="intro__rule">
            {player === 0
              ? tr(`${nameOf(1)}, regarde ailleurs ! Au programme : `, `${nameOf(1)}, look away! Up next: `)
              : tr(`${nameOf(0)} a fini son tour. La même partie t’attend : `, `${nameOf(0)} has finished their turn. The same game is waiting for you: `)}
            <strong>{GAMES[current.gameId].name}</strong>.
          </p>
        </div>
        <button type="button" className="cta mode-cta" onClick={() => setPhase('play')} autoFocus>
          <span className="cta__text">
            <span className="cta__label">{tr('Je suis prêt', 'I’m ready')}</span>
            <span className="cta__sub">
              {tr(`${DOMAINS[GAMES[current.gameId].domain].name} · niveau ${level}`, `${DOMAINS[GAMES[current.gameId].domain].name} · level ${level}`)}
            </span>
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
        badge={tr(`Duel · ${nameOf(player)} · manche ${round + 1}/${DUEL_ROUNDS}`, `Duel · ${nameOf(player)} · round ${round + 1}/${DUEL_ROUNDS}`)}
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
              {tr(`Au tour de ${nameOf(1)}`, `${nameOf(1)}’s turn`)}
              <Icon name="arrow" />
            </button>
          ) : (
            <button type="button" className="btn btn--primary btn--lg" onClick={() => setPhase('round')} autoFocus>
              {tr('Résultat de la manche', 'Round result')}
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
        <ModeHeader onBack={quitDuel} badge={tr(`Manche ${round + 1}/${DUEL_ROUNDS}`, `Round ${round + 1}/${DUEL_ROUNDS}`)} />
        <div className="intro__head">
          <p className="mode-item__sub">{GAMES[current.gameId].name}</p>
          <h1 className="intro__title">{winner === null ? tr('Égalité !', 'It’s a tie!') : tr(`${nameOf(winner)} gagne la manche !`, `${nameOf(winner)} wins the round!`)}</h1>
        </div>
        <DuelBoard names={[nameOf(0), nameOf(1)]} scores={roundScores} highlight={winner} />
        <p className="mode-note">
          {tr(
            `Manches gagnées : ${nameOf(0)} ${wins[0]} – ${wins[1]} ${nameOf(1)}`,
            `Rounds won: ${nameOf(0)} ${wins[0]} – ${wins[1]} ${nameOf(1)}`,
          )}
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
            <span className="cta__label">{lastRound ? tr('Voir le vainqueur', 'See the winner') : tr(`Manche ${round + 2}`, `Round ${round + 2}`)}</span>
            <span className="cta__sub">{lastRound ? tr('Fin du duel', 'End of the duel') : tr(`${nameOf(0)} commence`, `${nameOf(0)} goes first`)}</span>
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
      <ModeHeader onBack={() => navigate({ name: 'training' }, { replace: true })} badge={tr('Fin du duel', 'End of the duel')} />
      <div className="intro__head duel-final">
        {winner !== null && <span className={`duel-avatar duel-avatar--${winner} duel-avatar--big`}>{nameOf(winner).charAt(0).toUpperCase()}</span>}
        <h1 className="intro__title">
          {winner === null ? tr('Égalité parfaite !', 'A perfect tie!') : tr(`${nameOf(winner)} remporte le duel !`, `${nameOf(winner)} wins the duel!`)}
        </h1>
        <p className="intro__rule">
          {tr(
            `${wins[0]} manche${wins[0] > 1 ? 's' : ''} à ${wins[1]} · ${totals[0]} contre ${totals[1]} points au total`,
            `${wins[0]} to ${wins[1]} in rounds · ${totals[0]} to ${totals[1]} points in total`,
          )}
        </p>
      </div>
      <ol className="mode-list">
        {rounds.map((r, i) => {
          const s = scores[i] as [number, number];
          const w = roundWinner(s);
          return (
            <li key={i} className="mode-item">
              <GameArt gameId={r.gameId} size={44} />
              <span className="mode-item__text">
                <span className="mode-item__name">{tr(`Manche ${i + 1} · ${GAMES[r.gameId].name}`, `Round ${i + 1} · ${GAMES[r.gameId].name}`)}</span>
                <span className="mode-item__sub">{w === null ? tr('égalité', 'tie') : tr(`pour ${nameOf(w)}`, `won by ${nameOf(w)}`)}</span>
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
          {tr('Revanche', 'Rematch')}
        </button>
        <button type="button" className="btn btn--lg btn--ghost" onClick={() => navigate({ name: 'training' }, { replace: true })}>
          {tr('Terminer', 'Finish')}
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
