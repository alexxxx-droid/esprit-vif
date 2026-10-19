import { useEffect, useMemo, useState } from 'react';
import {
  CHALLENGE_GAMES,
  challengeGames,
  challengeSeed,
  challengeStandings,
  challengeUrl,
  decodeChallenge,
  encodeChallenge,
  friendRanking,
  mergeResults,
  resultsFromLink,
  type ChallengeLink,
  type FriendResult,
  type Standing,
} from '../../core/challenges';
import { plural } from '../../core/format';
import { DOMAIN_ORDER, DOMAINS, GAMES } from '../../core/games/registry';
import { tr } from '../../core/lang';
import { DUEL_DIFFICULTIES, type DuelDifficulty } from '../../core/modes';
import { hashSeed, randomSeed } from '../../core/rng';
import type { Domain } from '../../core/types';
import { profileName } from '../../store/profiles';
import { DomainBadge } from '../components/bits';
import { GameArt } from '../components/GameArt';
import { Icon } from '../components/Icon';
import { Mascot } from '../components/Mascot';
import { ProfileAvatar } from '../components/Players';
import { GameRunner } from '../game/GameRunner';
import { useToday } from '../hooks';
import { copyText, platform } from '../platform';
import { useProfileManager, useProfiles } from '../profiles-context';
import { useProgress, useStore } from '../progress-context';
import { navigate } from '../router';

const SCORE_MAX = CHALLENGE_GAMES * 100;

function useMyName() {
  const { active, profiles } = useProfiles();
  return profileName(active, profiles);
}

/**
 * Le prénom part dans le lien : sans lui, le score reviendrait signé « Joueur 1 ».
 * Renvoie le champ à afficher (rien si le joueur a déjà un prénom) et de quoi l'enregistrer.
 */
function useNameGate() {
  const manager = useProfileManager();
  const { active } = useProfiles();
  const [draft, setDraft] = useState('');
  const missing = !active.name.trim();
  const field = missing ? (
    <label className="field">
      <span className="field__label">{tr('Ton prénom, pour que tes amies te reconnaissent', 'Your first name, so your friends know it’s you')}</span>
      <input
        className="field__input"
        value={draft}
        maxLength={16}
        placeholder={tr('Prénom', 'First name')}
        autoComplete="given-name"
        onChange={(e) => setDraft(e.target.value)}
      />
    </label>
  ) : null;
  return {
    field,
    ready: !missing || draft.trim().length > 0,
    /** Enregistre le prénom saisi ; renvoie le nom à utiliser. */
    commit: async () => {
      if (!missing) return active.name;
      const name = draft.trim();
      await manager.update(active.id, { name });
      return name;
    },
  };
}

/** Avatar d'une amie : son initiale, sur une couleur tirée de son prénom (toujours la même). */
function FriendAvatar({ name, me, size = 40 }: { name: string; me: boolean; size?: number }) {
  const { active } = useProfiles();
  if (me) return <ProfileAvatar profile={active} size={size} />;
  return (
    <span className={`avatar avatar--c${hashSeed(name.toLowerCase()) % 6}`} style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function Header({ onBack, badge }: { onBack: () => void; badge?: string }) {
  return (
    <header className="intro__top">
      <button type="button" className="icon-btn" onClick={onBack} aria-label={tr('Retour', 'Back')}>
        <Icon name="back" />
      </button>
      {badge && <span className="pill">{badge}</span>}
    </header>
  );
}

export function ChallengeScreen({ code }: { code: string | null }) {
  const link = useMemo(() => (code ? decodeChallenge(code) : null), [code]);
  if (code === null) return <ChallengeHub />;
  if (!link) return <BrokenLink />;
  return <ChallengeRun link={link} />;
}

function BrokenLink() {
  return (
    <div className="screen screen-in mode-screen">
      <Header onBack={() => navigate({ name: 'challenge', code: null }, { replace: true })} />
      <div className="intro__head duel-final">
        <Mascot mood="gentle" size={110} />
        <h1 className="intro__title">{tr('Ce lien de défi est incomplet', 'This challenge link is incomplete')}</h1>
        <p className="intro__rule">
          {tr(
            'Il a sans doute été coupé en route. Demande à ton amie de te le renvoyer en entier.',
            'It probably got cut off along the way. Ask your friend to send you the whole link again.',
          )}
        </p>
      </div>
      <button type="button" className="btn btn--primary btn--lg mode-cta" onClick={() => navigate({ name: 'challenge', code: null }, { replace: true })}>
        {tr('Voir mes défis', 'See my challenges')}
      </button>
    </div>
  );
}

/* ---------- L'accueil des défis : en créer un, ceux en cours, le classement ---------- */

function ChallengeHub() {
  const data = useProgress();
  const today = useToday();
  const me = useMyName();
  const [domain, setDomain] = useState<Domain | 'mix'>('mix');
  const [difficulty, setDifficulty] = useState<DuelDifficulty>('facile');
  const [tab, setTab] = useState<Domain | 'all'>('all');
  const [pasted, setPasted] = useState('');
  const pastedLink = pasted.trim() ? decodeChallenge(pasted) : null;
  const { challenges, friends } = data.extras;
  const nameGate = useNameGate();

  const create = async () => {
    const from = await nameGate.commit();
    const seed = randomSeed();
    const link: ChallengeLink = {
      id: `${seed.toString(36)}${Date.now().toString(36).slice(-4)}`,
      seed,
      level: DUEL_DIFFICULTIES[difficulty].level,
      games: challengeGames(seed, domain),
      from,
      scores: null,
      day: today,
    };
    navigate({ name: 'challenge', code: encodeChallenge(link) });
  };

  const domainOf = (id: keyof typeof GAMES) => GAMES[id].domain;
  const ranked = DOMAIN_ORDER.filter((d) => friends.some((r) => domainOf(r.gameId) === d));
  const ranking = friendRanking(friends, tab, domainOf);
  const hasFriends = friends.some((r) => !r.me);
  const recent = [...challenges].reverse().slice(0, 8);

  return (
    <div className="screen screen-in mode-screen">
      <Header onBack={() => navigate({ name: 'training' }, { replace: true })} />
      <div className="intro__head">
        <h1 className="intro__title">{tr('Défis entre amies', 'Friend challenges')}</h1>
        <p className="intro__rule">
          {tr(
            'Tu joues trois parties, puis tu envoies le lien : tes amies jouent exactement les mêmes sur leur téléphone. Vos scores forment un classement par catégorie, gardé sur chaque appareil, sans compte.',
            'You play three games, then send the link: your friends play exactly the same ones on their phones. Your scores make a leaderboard for each category, kept on each device, no account needed.',
          )}
        </p>
      </div>

      <section className="card challenge-new" aria-labelledby="challenge-new">
        <h2 className="section-title" id="challenge-new">
          {tr('Nouveau défi', 'New challenge')}
        </h2>
        <div className="field">
          <span className="field__label" id="challenge-domain">
            {tr('Catégorie', 'Category')}
          </span>
          <div className="challenge-chips" role="radiogroup" aria-labelledby="challenge-domain">
            <button type="button" role="radio" aria-checked={domain === 'mix'} className="challenge-chip" onClick={() => setDomain('mix')}>
              <span className="challenge-chip__mix" aria-hidden="true">
                <Icon name="spark" size={14} />
              </span>
              {tr('Un peu de tout', 'A bit of everything')}
            </button>
            {DOMAIN_ORDER.map((d) => (
              <button key={d} type="button" role="radio" aria-checked={domain === d} className="challenge-chip" onClick={() => setDomain(d)}>
                <DomainBadge domain={d} size={24} />
                {DOMAINS[d].name}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field__label" id="challenge-level">
            {tr('Difficulté', 'Difficulty')}
          </span>
          <div className="segmented duel-setup__levels" role="radiogroup" aria-labelledby="challenge-level">
            {(Object.keys(DUEL_DIFFICULTIES) as DuelDifficulty[]).map((key) => (
              <button key={key} type="button" role="radio" aria-checked={difficulty === key} className="segmented__option" onClick={() => setDifficulty(key)}>
                {DUEL_DIFFICULTIES[key].label}
                <small>{tr(`niveau ${DUEL_DIFFICULTIES[key].level}`, `level ${DUEL_DIFFICULTIES[key].level}`)}</small>
              </button>
            ))}
          </div>
        </div>
        {nameGate.field}
        <button type="button" className="cta" onClick={() => void create()} disabled={!nameGate.ready}>
          <span className="cta__text">
            <span className="cta__label">{tr('Créer le défi', 'Create the challenge')}</span>
            <span className="cta__sub">{tr('3 jeux · tu joues d’abord, puis tu l’envoies', '3 games · you play first, then send it')}</span>
          </span>
          <span className="cta__icon">
            <Icon name="play" />
          </span>
        </button>
      </section>

      <section aria-labelledby="challenge-ranking">
        <h2 className="section-title" id="challenge-ranking">
          {tr('Classement entre amies', 'Friends leaderboard')}
        </h2>
        {hasFriends ? (
          <>
            <div className="challenge-chips challenge-chips--scroll" role="tablist" aria-label={tr('Catégorie du classement', 'Leaderboard category')}>
              {(['all', ...ranked] as const).map((d) => (
                <button key={d} type="button" role="tab" aria-selected={tab === d} className="challenge-chip" onClick={() => setTab(d)}>
                  {d !== 'all' && <DomainBadge domain={d} size={24} />}
                  {d === 'all' ? tr('Toutes catégories', 'All categories') : DOMAINS[d].name}
                </button>
              ))}
            </div>
            <ol className="mode-list challenge-ranking">
              {ranking.map((row, i) => (
                <li key={row.me ? '' : row.name.toLowerCase()} className={`mode-item${row.me ? ' is-me' : ''}`}>
                  <span className="mode-item__rank">{ranking.findIndex((r) => r.average === row.average) + 1}</span>
                  <FriendAvatar name={row.name} me={row.me} size={40} />
                  <span className="mode-item__text">
                    <span className="mode-item__name">
                      {row.name}
                      {row.me && <span className="challenge-me">{tr(' (toi)', ' (you)')}</span>}
                    </span>
                    <span className="mode-item__sub">{tr(plural(row.games, 'partie', 'parties'), plural(row.games, 'game'))}</span>
                  </span>
                  <span className="mode-item__score">
                    {row.average}
                    <small>{tr(' de moyenne', ' average')}</small>
                  </span>
                  {i === 0 && ranking.length > 1 && <span className="visually-hidden">{tr('en tête', 'in the lead')}</span>}
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="empty">
            <Icon name="users" size={22} />
            {tr(
              'Pas encore de classement : crée un défi et envoie-le à tes amies. Leurs scores reviennent quand elles te renvoient le lien.',
              'No leaderboard yet: create a challenge and send it to your friends. Their scores come back when they send you the link back.',
            )}
          </p>
        )}
      </section>

      {recent.length > 0 && (
        <section aria-labelledby="challenge-recent">
          <h2 className="section-title" id="challenge-recent">
            {tr('Mes défis', 'My challenges')}
          </h2>
          <div className="mode-list">
            {recent.map((c) => {
              const standings = challengeStandings(friends, c);
              const mine = standings.find((s) => s.me && s.complete);
              const others = standings.filter((s) => !s.me);
              return (
                <button
                  key={c.id}
                  type="button"
                  className="mode-item mode-item--button"
                  onClick={() => navigate({ name: 'challenge', code: encodeChallenge({ ...c, scores: null }) })}
                >
                  <span className="challenge-arts" aria-hidden="true">
                    {c.games.map((g) => (
                      <GameArt key={g} gameId={g} size={30} />
                    ))}
                  </span>
                  <span className="mode-item__text">
                    <span className="mode-item__name">{c.from === me ? tr('Ton défi', 'Your challenge') : tr(`Défi de ${c.from}`, `${c.from}’s challenge`)}</span>
                    <span className="mode-item__sub">
                      {tr(`niveau ${c.level}`, `level ${c.level}`)}
                      {others.length > 0
                        ? tr(` · avec ${others.map((s) => s.name).join(', ')}`, ` · with ${others.map((s) => s.name).join(', ')}`)
                        : tr(' · en attente de réponses', ' · waiting for replies')}
                    </span>
                  </span>
                  {mine ? <span className="mode-item__score">{mine.total}</span> : <span className="reason reason--weak">{tr('À relever', 'To play')}</span>}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="card challenge-paste" aria-labelledby="challenge-paste">
        <h2 className="section-title" id="challenge-paste">
          {tr('On t’a envoyé un lien\u00a0?', 'Got a link from someone?')}
        </h2>
        <p className="mode-item__sub">{tr('Il s’ouvre tout seul depuis ta messagerie. Sinon, colle-le ici.', 'It opens by itself from your messaging app. If not, paste it here.')}</p>
        <div className="challenge-paste__row">
          <input
            className="field__input"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={tr('Colle le lien du défi', 'Paste the challenge link')}
            aria-label={tr('Lien du défi', 'Challenge link')}
            autoComplete="off"
          />
          <button
            type="button"
            className="btn btn--primary"
            disabled={!pastedLink}
            onClick={() => pastedLink && navigate({ name: 'challenge', code: encodeChallenge(pastedLink) })}
          >
            {tr('Ouvrir', 'Open')}
          </button>
        </div>
        {pasted.trim() && !pastedLink && (
          <p className="challenge-paste__error">{tr('Ce lien ne ressemble pas à un défi Esprit Vif.', 'This link doesn’t look like an Esprit Vif challenge.')}</p>
        )}
      </section>
    </div>
  );
}

/* ---------- Un défi : le relever, puis comparer et renvoyer ---------- */

function ChallengeRun({ link }: { link: ChallengeLink }) {
  const data = useProgress();
  const store = useStore();
  const me = useMyName();
  const today = useToday();
  const stored = data.extras.friends;
  const alreadyMine = stored.some((r) => r.challenge === link.id && r.me);
  // Mon propre lien rouvert : ses scores sont déjà les miens, pas ceux d'une amie.
  const incoming = useMemo(
    () => (alreadyMine && link.from.toLowerCase() === me.toLowerCase() ? [] : resultsFromLink(link)),
    [alreadyMine, link, me],
  );
  const [scores, setScores] = useState<number[]>([]);
  const [playing, setPlaying] = useState<number | null>(null);
  const nameGate = useNameGate();
  const results = mergeResults(stored, incoming);
  const standings = challengeStandings(results, link);
  const mine = standings.find((s) => s.me && s.complete);
  const author = link.from.toLowerCase() === me.toLowerCase() && !link.scores;

  // Les scores apportés par le lien rejoignent le classement dès l'ouverture.
  const incomingKey = incoming.map((r) => `${r.name}:${r.gameId}:${r.score}`).join('|');
  useEffect(() => {
    if (incoming.length) void store.recordChallenge(link, incoming);
    // incomingKey résume `incoming` : inutile de réenregistrer pour un tableau recréé à l'identique.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingKey, link.id, store]);

  if (playing !== null) {
    const gameId = link.games[playing];
    const last = playing === link.games.length - 1;
    return (
      <GameRunner
        key={playing}
        meta={GAMES[gameId]}
        level={link.level}
        mode="free"
        fixedSeed={challengeSeed(link, playing)}
        badge={tr(`Défi · ${playing + 1}/${link.games.length}`, `Challenge · ${playing + 1}/${link.games.length}`)}
        save={async (outcome) => {
          const next = [...scores.slice(0, playing), outcome.score];
          setScores(next);
          if (last) {
            const own: FriendResult[] = link.games.map((g, i) => ({ challenge: link.id, name: me, me: true, gameId: g, score: next[i], day: today }));
            await store.recordChallenge(link, [...incoming, ...own]);
          }
          return null;
        }}
        actions={() => (
          <button type="button" className="btn btn--primary btn--lg" onClick={() => setPlaying(last ? null : playing + 1)} autoFocus>
            {last
              ? tr('Voir le résultat du défi', 'See the challenge results')
              : tr(`Jeu suivant : ${GAMES[link.games[playing + 1]].name}`, `Next game: ${GAMES[link.games[playing + 1]].name}`)}
            <Icon name="arrow" />
          </button>
        )}
        onQuit={() => setPlaying(null)}
      />
    );
  }

  const back = () => navigate({ name: 'challenge', code: null }, { replace: true });

  if (mine) return <ChallengeResult link={link} standings={standings} mine={mine} onBack={back} />;

  const rival = standings.find((s) => !s.me && s.complete);
  return (
    <div className="screen screen-in mode-screen">
      <Header onBack={back} badge={tr(`niveau ${link.level}`, `level ${link.level}`)} />
      <div className="intro__head duel-final">
        {author ? <Mascot mood="cheer" size={110} /> : <FriendAvatar name={link.from} me={false} size={96} />}
        <h1 className="intro__title">
          {author ? tr('Ton défi est prêt', 'Your challenge is ready') : tr(`${link.from} te défie\u00a0!`, `${link.from} challenges you!`)}
        </h1>
        <p className="intro__rule">
          {author
            ? tr(
                'Joue les trois parties, puis envoie le lien : tes amies auront exactement les mêmes à jouer.',
                'Play the three games, then send the link: your friends will get exactly the same ones to play.',
              )
            : rival
              ? tr(`Mêmes parties, même niveau. Son score reste caché jusqu’à la fin de la tienne.`, 'Same games, same level. Their score stays hidden until you finish yours.')
              : tr('Mêmes parties, même niveau pour tout le monde.', 'Same games, same level for everyone.')}
        </p>
      </div>
      <ol className="mode-list">
        {link.games.map((gameId, i) => (
          <li key={gameId} className={`mode-item${scores[i] !== undefined ? ' is-done' : ''}`}>
            <GameArt gameId={gameId} size={44} />
            <span className="mode-item__text">
              <span className="mode-item__name">
                {i + 1}. {GAMES[gameId].name}
              </span>
              <span className="mode-item__sub">{DOMAINS[GAMES[gameId].domain].name}</span>
            </span>
            {scores[i] !== undefined ? (
              <span className="mode-item__score">{tr(`${scores[i]} pts`, `${scores[i]} pts`)}</span>
            ) : (
              rival && <span className="challenge-hidden">?</span>
            )}
          </li>
        ))}
      </ol>
      {nameGate.field}
      <p className="mode-note">
        <Icon name="info" size={18} />
        {tr('Une seule tentative par défi. Tes niveaux ne bougent pas.', 'One try per challenge. Your levels don’t change.')}
      </p>
      <button
        type="button"
        className="cta mode-cta"
        disabled={!nameGate.ready}
        onClick={async () => {
          await nameGate.commit();
          setPlaying(scores.length);
        }}
        autoFocus={nameGate.ready}
      >
        <span className="cta__text">
          <span className="cta__label">
            {scores.length ? tr('Continuer', 'Continue') : author ? tr('Jouer mon défi', 'Play my challenge') : tr('Relever le défi', 'Take the challenge')}
          </span>
          <span className="cta__sub">
            {scores.length
              ? tr(`jeu ${scores.length + 1} sur ${link.games.length}`, `game ${scores.length + 1} of ${link.games.length}`)
              : `≈ ${link.games.length + 1} minutes`}
          </span>
        </span>
        <span className="cta__icon">
          <Icon name="play" />
        </span>
      </button>
    </div>
  );
}

function ChallengeResult({ link, standings, mine, onBack }: { link: ChallengeLink; standings: Standing[]; mine: Standing; onBack: () => void }) {
  const me = useMyName();
  const today = useToday();
  const [notice, setNotice] = useState<string | null>(null);
  const complete = standings.filter((s) => s.complete);
  const others = complete.filter((s) => !s.me);
  const top = complete[0];
  const tied = complete.filter((s) => s.total === top.total).length > 1;
  const reply: ChallengeLink = { ...link, from: me, scores: mine.scores.map((s) => s ?? 0), day: today };
  const url = challengeUrl(reply);
  const gameNames = link.games.map((g) => GAMES[g].name).join(', ');
  const text = others.length
    ? tr(
        `Mon score au défi Esprit Vif : ${mine.total}/${SCORE_MAX}. Ajoute-le à ton classement !`,
        `My score in the Esprit Vif challenge: ${mine.total}/${SCORE_MAX}. Add it to your leaderboard!`,
      )
    : tr(
        `${me} te défie sur Esprit Vif : ${gameNames} (niveau ${link.level}). Mon score : ${mine.total}/${SCORE_MAX}. À toi !`,
        `${me} challenges you on Esprit Vif: ${gameNames} (level ${link.level}). My score: ${mine.total}/${SCORE_MAX}. Your turn!`,
      );
  const copied = tr('Lien copié : colle-le dans ta messagerie.', 'Link copied: paste it into your messaging app.');

  const send = async () => {
    const result = await platform().shareLink(text, url);
    if (result === 'copied') setNotice(copied);
    if (result === 'failed') setNotice(tr('Partage impossible ici : utilise « Copier le lien ».', 'Sharing isn’t available here: use “Copy the link”.'));
  };
  const copy = async () => setNotice((await copyText(url)) ? copied : tr('Copie impossible : sélectionne le lien à la main.', 'Couldn’t copy: select the link by hand.'));

  return (
    <div className="screen screen-in mode-screen">
      <Header onBack={onBack} badge={tr(`niveau ${link.level}`, `level ${link.level}`)} />
      <div className="intro__head duel-final">
        {others.length === 0 ? (
          <>
            <Mascot mood="cheer" size={110} />
            <h1 className="intro__title mode-total">
              {mine.total}
              <small> / {SCORE_MAX}</small>
            </h1>
            <p className="intro__rule">
              {tr(
                'Envoie le lien : celles qui le reçoivent jouent les mêmes parties, puis te renvoient leur score.',
                'Send the link: whoever gets it plays the same games, then sends you their score.',
              )}
            </p>
          </>
        ) : (
          <>
            {tied ? <Mascot mood="happy" size={110} /> : top.me ? <Mascot mood="cheer" size={110} /> : <FriendAvatar name={top.name} me={false} size={96} />}
            <h1 className="intro__title">
              {tied
                ? tr('Égalité au sommet\u00a0!', 'A tie at the top!')
                : top.me
                  ? tr('Tu remportes le défi\u00a0!', 'You win the challenge!')
                  : tr(`${top.name} remporte le défi\u00a0!`, `${top.name} wins the challenge!`)}
            </h1>
            <p className="intro__rule">
              {tr(
                `Ton score : ${mine.total} / ${SCORE_MAX}. Renvoie le lien pour que tes amies voient le tien.`,
                `Your score: ${mine.total} / ${SCORE_MAX}. Send the link back so your friends can see it.`,
              )}
            </p>
          </>
        )}
      </div>
      <div className="challenge-table" role="table" aria-label={tr('Scores du défi', 'Challenge scores')}>
        <div className="challenge-table__row challenge-table__head" role="row">
          <span role="columnheader">{tr('Joueuse', 'Player')}</span>
          {link.games.map((g) => (
            <span key={g} role="columnheader" className="challenge-table__game" title={GAMES[g].name}>
              <GameArt gameId={g} size={30} />
              <span className="visually-hidden">{GAMES[g].name}</span>
            </span>
          ))}
          <span role="columnheader">Total</span>
        </div>
        {standings.map((s) => (
          <div key={s.me ? '' : s.name.toLowerCase()} className={`challenge-table__row${s.me ? ' is-me' : ''}${s === top && !tied && others.length ? ' is-top' : ''}`} role="row">
            <span role="cell" className="challenge-table__who">
              <FriendAvatar name={s.name} me={s.me} size={32} />
              <span className="challenge-table__name">{s.me ? tr('Toi', 'You') : s.name}</span>
            </span>
            {s.scores.map((score, i) => (
              <span key={i} role="cell" className="challenge-table__score">
                {score ?? '–'}
              </span>
            ))}
            <span role="cell" className="challenge-table__total">
              {s.total}
            </span>
          </div>
        ))}
      </div>
      {notice && (
        <p className="mode-note" role="status">
          <Icon name="check" size={18} />
          {notice}
        </p>
      )}
      <div className="mode-actions">
        <button type="button" className="btn btn--primary btn--lg" onClick={() => void send()} autoFocus>
          <Icon name="share" />
          {others.length ? tr('Renvoyer mon score', 'Send my score back') : tr('Envoyer le défi', 'Send the challenge')}
        </button>
        <button type="button" className="btn btn--lg btn--ghost" onClick={() => void copy()}>
          {tr('Copier le lien', 'Copy the link')}
        </button>
        <button type="button" className="btn btn--lg btn--ghost" onClick={onBack}>
          {tr('Classement entre amies', 'Friends leaderboard')}
        </button>
      </div>
    </div>
  );
}
