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
      <span className="field__label">Ton prénom, pour que tes amies te reconnaissent</span>
      <input className="field__input" value={draft} maxLength={16} placeholder="Prénom" autoComplete="given-name" onChange={(e) => setDraft(e.target.value)} />
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
      <button type="button" className="icon-btn" onClick={onBack} aria-label="Retour">
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
        <h1 className="intro__title">Ce lien de défi est incomplet</h1>
        <p className="intro__rule">Il a sans doute été coupé en route. Demande à ton amie de te le renvoyer en entier.</p>
      </div>
      <button type="button" className="btn btn--primary btn--lg mode-cta" onClick={() => navigate({ name: 'challenge', code: null }, { replace: true })}>
        Voir mes défis
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
        <h1 className="intro__title">Défis entre amies</h1>
        <p className="intro__rule">
          Tu joues trois parties, puis tu envoies le lien : tes amies jouent exactement les mêmes sur leur téléphone. Vos scores forment un classement par catégorie, gardé
          sur chaque appareil, sans compte.
        </p>
      </div>

      <section className="card challenge-new" aria-labelledby="challenge-new">
        <h2 className="section-title" id="challenge-new">
          Nouveau défi
        </h2>
        <div className="field">
          <span className="field__label" id="challenge-domain">
            Catégorie
          </span>
          <div className="challenge-chips" role="radiogroup" aria-labelledby="challenge-domain">
            <button type="button" role="radio" aria-checked={domain === 'mix'} className="challenge-chip" onClick={() => setDomain('mix')}>
              <span className="challenge-chip__mix" aria-hidden="true">
                <Icon name="spark" size={14} />
              </span>
              Un peu de tout
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
            Difficulté
          </span>
          <div className="segmented duel-setup__levels" role="radiogroup" aria-labelledby="challenge-level">
            {(Object.keys(DUEL_DIFFICULTIES) as DuelDifficulty[]).map((key) => (
              <button key={key} type="button" role="radio" aria-checked={difficulty === key} className="segmented__option" onClick={() => setDifficulty(key)}>
                {DUEL_DIFFICULTIES[key].label}
                <small>niveau {DUEL_DIFFICULTIES[key].level}</small>
              </button>
            ))}
          </div>
        </div>
        {nameGate.field}
        <button type="button" className="cta" onClick={() => void create()} disabled={!nameGate.ready}>
          <span className="cta__text">
            <span className="cta__label">Créer le défi</span>
            <span className="cta__sub">3 jeux · tu joues d’abord, puis tu l’envoies</span>
          </span>
          <span className="cta__icon">
            <Icon name="play" />
          </span>
        </button>
      </section>

      <section aria-labelledby="challenge-ranking">
        <h2 className="section-title" id="challenge-ranking">
          Classement entre amies
        </h2>
        {hasFriends ? (
          <>
            <div className="challenge-chips challenge-chips--scroll" role="tablist" aria-label="Catégorie du classement">
              {(['all', ...ranked] as const).map((d) => (
                <button key={d} type="button" role="tab" aria-selected={tab === d} className="challenge-chip" onClick={() => setTab(d)}>
                  {d !== 'all' && <DomainBadge domain={d} size={24} />}
                  {d === 'all' ? 'Toutes catégories' : DOMAINS[d].name}
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
                      {row.me && <span className="challenge-me"> (toi)</span>}
                    </span>
                    <span className="mode-item__sub">{plural(row.games, 'partie', 'parties')}</span>
                  </span>
                  <span className="mode-item__score">
                    {row.average}
                    <small> de moyenne</small>
                  </span>
                  {i === 0 && ranking.length > 1 && <span className="visually-hidden">en tête</span>}
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="empty">
            <Icon name="users" size={22} />
            Pas encore de classement : crée un défi et envoie-le à tes amies. Leurs scores reviennent quand elles te renvoient le lien.
          </p>
        )}
      </section>

      {recent.length > 0 && (
        <section aria-labelledby="challenge-recent">
          <h2 className="section-title" id="challenge-recent">
            Mes défis
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
                    <span className="mode-item__name">{c.from === me ? 'Ton défi' : `Défi de ${c.from}`}</span>
                    <span className="mode-item__sub">
                      niveau {c.level}
                      {others.length > 0 ? ` · avec ${others.map((s) => s.name).join(', ')}` : ' · en attente de réponses'}
                    </span>
                  </span>
                  {mine ? <span className="mode-item__score">{mine.total}</span> : <span className="reason reason--weak">À relever</span>}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="card challenge-paste" aria-labelledby="challenge-paste">
        <h2 className="section-title" id="challenge-paste">
          On t’a envoyé un lien&nbsp;?
        </h2>
        <p className="mode-item__sub">Il s’ouvre tout seul depuis ta messagerie. Sinon, colle-le ici.</p>
        <div className="challenge-paste__row">
          <input
            className="field__input"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="Colle le lien du défi"
            aria-label="Lien du défi"
            autoComplete="off"
          />
          <button
            type="button"
            className="btn btn--primary"
            disabled={!pastedLink}
            onClick={() => pastedLink && navigate({ name: 'challenge', code: encodeChallenge(pastedLink) })}
          >
            Ouvrir
          </button>
        </div>
        {pasted.trim() && !pastedLink && <p className="challenge-paste__error">Ce lien ne ressemble pas à un défi Esprit Vif.</p>}
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
        badge={`Défi · ${playing + 1}/${link.games.length}`}
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
            {last ? 'Voir le résultat du défi' : `Jeu suivant : ${GAMES[link.games[playing + 1]].name}`}
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
      <Header onBack={back} badge={`niveau ${link.level}`} />
      <div className="intro__head duel-final">
        {author ? <Mascot mood="cheer" size={110} /> : <FriendAvatar name={link.from} me={false} size={96} />}
        <h1 className="intro__title">{author ? 'Ton défi est prêt' : `${link.from} te défie\u00a0!`}</h1>
        <p className="intro__rule">
          {author
            ? 'Joue les trois parties, puis envoie le lien : tes amies auront exactement les mêmes à jouer.'
            : rival
              ? `Mêmes parties, même niveau. Son score reste caché jusqu’à la fin de la tienne.`
              : 'Mêmes parties, même niveau pour tout le monde.'}
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
            {scores[i] !== undefined ? <span className="mode-item__score">{scores[i]} pts</span> : rival && <span className="challenge-hidden">?</span>}
          </li>
        ))}
      </ol>
      {nameGate.field}
      <p className="mode-note">
        <Icon name="info" size={18} />
        Une seule tentative par défi. Tes niveaux ne bougent pas.
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
          <span className="cta__label">{scores.length ? 'Continuer' : author ? 'Jouer mon défi' : 'Relever le défi'}</span>
          <span className="cta__sub">{scores.length ? `jeu ${scores.length + 1} sur ${link.games.length}` : `≈ ${link.games.length + 1} minutes`}</span>
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
  const text = others.length
    ? `Mon score au défi Esprit Vif : ${mine.total}/${SCORE_MAX}. Ajoute-le à ton classement !`
    : `${me} te défie sur Esprit Vif : ${link.games.map((g) => GAMES[g].name).join(', ')} (niveau ${link.level}). Mon score : ${mine.total}/${SCORE_MAX}. À toi !`;

  const send = async () => {
    const result = await platform().shareLink(text, url);
    if (result === 'copied') setNotice('Lien copié : colle-le dans ta messagerie.');
    if (result === 'failed') setNotice('Partage impossible ici : utilise « Copier le lien ».');
  };
  const copy = async () => setNotice((await copyText(url)) ? 'Lien copié : colle-le dans ta messagerie.' : 'Copie impossible : sélectionne le lien à la main.');

  return (
    <div className="screen screen-in mode-screen">
      <Header onBack={onBack} badge={`niveau ${link.level}`} />
      <div className="intro__head duel-final">
        {others.length === 0 ? (
          <>
            <Mascot mood="cheer" size={110} />
            <h1 className="intro__title mode-total">
              {mine.total}
              <small> / {SCORE_MAX}</small>
            </h1>
            <p className="intro__rule">Envoie le lien : celles qui le reçoivent jouent les mêmes parties, puis te renvoient leur score.</p>
          </>
        ) : (
          <>
            {tied ? <Mascot mood="happy" size={110} /> : top.me ? <Mascot mood="cheer" size={110} /> : <FriendAvatar name={top.name} me={false} size={96} />}
            <h1 className="intro__title">{tied ? 'Égalité au sommet\u00a0!' : top.me ? 'Tu remportes le défi\u00a0!' : `${top.name} remporte le défi\u00a0!`}</h1>
            <p className="intro__rule">
              Ton score : {mine.total} / {SCORE_MAX}. Renvoie le lien pour que tes amies voient le tien.
            </p>
          </>
        )}
      </div>
      <div className="challenge-table" role="table" aria-label="Scores du défi">
        <div className="challenge-table__row challenge-table__head" role="row">
          <span role="columnheader">Joueuse</span>
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
              <span className="challenge-table__name">{s.me ? 'Toi' : s.name}</span>
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
          {others.length ? 'Renvoyer mon score' : 'Envoyer le défi'}
        </button>
        <button type="button" className="btn btn--lg btn--ghost" onClick={() => void copy()}>
          Copier le lien
        </button>
        <button type="button" className="btn btn--lg btn--ghost" onClick={onBack}>
          Classement entre amies
        </button>
      </div>
    </div>
  );
}
