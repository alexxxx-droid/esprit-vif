import { useState } from 'react';
import { dailyGames, hasOfficialTest } from '../../core/daily';
import { DAILY_ROTATION, DOMAIN_ORDER, DOMAINS, GAMES, gamesOfDomain, type GameMeta } from '../../core/games/registry';
import { tr } from '../../core/lang';
import { MAX_LEVEL } from '../../core/levels';
import { gameStars, medalFor } from '../../core/progression';
import { gameUnlocked } from '../../store/progress';
import { DomainBadge, ScreenHeader } from '../components/bits';
import { GameArt } from '../components/GameArt';
import { Icon } from '../components/Icon';
import { MedalBadge } from '../components/progress-bits';
import { useToday } from '../hooks';
import { useProgress, useStore } from '../progress-context';
import { navigate } from '../router';

export function TrainingScreen() {
  const data = useProgress();
  const store = useStore();
  const today = useToday();
  const [starting, setStarting] = useState(false);
  const doneToday = hasOfficialTest(data.tests, today);

  const retakeTest = async () => {
    setStarting(true);
    await store.startTest(dailyGames(today, DAILY_ROTATION));
    navigate({ name: 'test' });
  };

  return (
    <div className="screen screen-in">
      <ScreenHeader
        title={tr('Entraînement', 'Training')}
        subtitle={tr('Chaque jeu a 20 niveaux : gagne des étoiles pour débloquer les suivants.', 'Each game has 20 levels: earn stars to unlock the next ones.')}
      />

      <section className="modes" aria-labelledby="modes-title">
        <h2 className="domain-section__title" id="modes-title">
          {tr('Modes de jeu', 'Game modes')}
        </h2>
        <div className="modes__grid">
          <button type="button" className="mode-tile" onClick={() => navigate({ name: 'session' })}>
            <span className="mode-tile__icon">
              <Icon name="target" />
            </span>
            <span className="mode-tile__title">{tr('Séance du jour', 'Daily session')}</span>
            <span className="mode-tile__sub">{tr('4 jeux sur mesure', '4 games made for you')}</span>
          </button>
          <button type="button" className="mode-tile" onClick={() => navigate({ name: 'marathon', domain: null })}>
            <span className="mode-tile__icon">
              <Icon name="flame" />
            </span>
            <span className="mode-tile__title">Marathon</span>
            <span className="mode-tile__sub">{tr('Tout un domaine d’affilée', 'A whole area in a row')}</span>
          </button>
          <button type="button" className="mode-tile" onClick={() => navigate({ name: 'duel' })}>
            <span className="mode-tile__icon">
              <Icon name="duel" />
            </span>
            <span className="mode-tile__title">{tr('Duel à deux', 'Two-player duel')}</span>
            <span className="mode-tile__sub">{tr('Même partie, à tour de rôle', 'Same game, taking turns')}</span>
          </button>
          <button type="button" className="mode-tile" onClick={() => navigate({ name: 'party' })}>
            <span className="mode-tile__icon">
              <Icon name="users" />
            </span>
            <span className="mode-tile__title">{tr('Mode fête', 'Party mode')}</span>
            <span className="mode-tile__sub">{tr('2 à 4 joueurs en même temps', '2 to 4 players at once')}</span>
          </button>
          <button type="button" className="mode-tile mode-tile--wide" onClick={() => navigate({ name: 'challenge', code: null })}>
            <span className="mode-tile__icon">
              <Icon name="share" />
            </span>
            <span className="mode-tile__text">
              <span className="mode-tile__title">{tr('Défis entre amies', 'Friend challenges')}</span>
              <span className="mode-tile__sub">
                {tr(
                  'Un lien, les mêmes parties chacune chez soi, et votre classement par catégorie',
                  'One link, the same games for everyone on their own phone, and your leaderboard by category',
                )}
              </span>
            </span>
            <Icon name="arrow" />
          </button>
        </div>
      </section>

      {DOMAIN_ORDER.map((domain) => {
        const games = gamesOfDomain(domain);
        if (games.length === 0) return null;
        return (
          <section key={domain} className="domain-section" aria-labelledby={`domain-${domain}`}>
            <h2 className="domain-section__title" id={`domain-${domain}`}>
              <DomainBadge domain={domain} size={26} />
              {DOMAINS[domain].name}
            </h2>
            <div className="game-grid">
              {games.map((id, i) => (
                // Un nombre impair de jeux : le dernier prend toute la largeur, plutôt qu'un trou.
                <GameCard key={id} meta={GAMES[id]} wide={games.length % 2 === 1 && i === games.length - 1} />
              ))}
            </div>
          </section>
        );
      })}

      {doneToday && (
        <button type="button" className="card card--action" onClick={() => void retakeTest()} disabled={starting}>
          <span className="card__icon">
            <Icon name="replay" />
          </span>
          <span className="card__text">
            <span className="card__title">{tr('Refaire le test du jour', 'Retake the daily test')}</span>
            <span className="card__sub">{tr('Pour le plaisir : il ne compte pas dans tes progrès.', 'Just for fun: it doesn’t count toward your progress.')}</span>
          </span>
          <Icon name="arrow" />
        </button>
      )}
    </div>
  );
}

/** Un mot de plus de 12 lettres (« Correspondance ») : le nom passe un cran plus petit, sans être coupé. */
const longWord = (name: string) => name.split(/\s+/).some((w) => w.length > 12);

function GameCard({ meta, wide }: { meta: GameMeta; wide: boolean }) {
  const data = useProgress();
  const bests = data.games[meta.id]?.bests;
  const unlocked = gameUnlocked(data, meta.id);
  const medal = medalFor(bests);
  const stars = gameStars(bests);
  const played = bests && Object.keys(bests).length > 0;
  return (
    <button type="button" className={`game-card${wide ? ' game-card--wide' : ''}`} onClick={() => navigate({ name: 'play', gameId: meta.id })}>
      <span className="game-card__top">
        <GameArt gameId={meta.id} size={52} />
        {medal && <MedalBadge medal={medal} />}
      </span>
      <span className={`game-card__name${longWord(meta.name) ? ' game-card__name--long' : ''}`}>{meta.name}</span>
      <span className="game-card__domain">{meta.duration}</span>
      {played ? (
        <span className="game-card__progress">
          <span className="mini-bar" aria-hidden="true">
            <span style={{ transform: `scaleX(${unlocked / MAX_LEVEL})` }} />
          </span>
          <span className="game-card__meta">
            <span>{tr(`Niv. ${unlocked}/${MAX_LEVEL}`, `Lv. ${unlocked}/${MAX_LEVEL}`)}</span>
            <span className="game-card__stars">
              <Icon name="star" size={13} />
              {stars}
            </span>
          </span>
        </span>
      ) : (
        <span className="game-card__new">{tr('À découvrir', 'Try it')}</span>
      )}
    </button>
  );
}
