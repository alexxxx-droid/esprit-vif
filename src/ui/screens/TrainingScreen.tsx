import { useState } from 'react';
import { dailyGames, hasOfficialTest } from '../../core/daily';
import { DAILY_ROTATION, DOMAIN_ORDER, DOMAINS, GAMES, gamesOfDomain, type GameMeta } from '../../core/games/registry';
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
      <ScreenHeader title="Entraînement" subtitle="Chaque jeu a 20 niveaux : gagne des étoiles pour débloquer les suivants." />

      <section className="modes" aria-labelledby="modes-title">
        <h2 className="domain-section__title" id="modes-title">
          Modes de jeu
        </h2>
        <div className="modes__grid">
          <button type="button" className="mode-tile" onClick={() => navigate({ name: 'session' })}>
            <span className="mode-tile__icon">
              <Icon name="target" />
            </span>
            <span className="mode-tile__title">Séance du jour</span>
            <span className="mode-tile__sub">4 jeux sur mesure</span>
          </button>
          <button type="button" className="mode-tile" onClick={() => navigate({ name: 'marathon', domain: null })}>
            <span className="mode-tile__icon">
              <Icon name="flame" />
            </span>
            <span className="mode-tile__title">Marathon</span>
            <span className="mode-tile__sub">Tout un domaine d’affilée</span>
          </button>
          <button type="button" className="mode-tile" onClick={() => navigate({ name: 'duel' })}>
            <span className="mode-tile__icon">
              <Icon name="duel" />
            </span>
            <span className="mode-tile__title">Duel à deux</span>
            <span className="mode-tile__sub">Même partie, même téléphone</span>
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
              {games.map((id) => (
                <GameCard key={id} meta={GAMES[id]} />
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
            <span className="card__title">Refaire le test du jour</span>
            <span className="card__sub">Pour le plaisir : il ne compte pas dans tes progrès.</span>
          </span>
          <Icon name="arrow" />
        </button>
      )}
    </div>
  );
}

function GameCard({ meta }: { meta: GameMeta }) {
  const data = useProgress();
  const bests = data.games[meta.id]?.bests;
  const unlocked = gameUnlocked(data, meta.id);
  const medal = medalFor(bests);
  const stars = gameStars(bests);
  const played = bests && Object.keys(bests).length > 0;
  return (
    <button type="button" className="game-card" onClick={() => navigate({ name: 'play', gameId: meta.id })}>
      <span className="game-card__top">
        <GameArt gameId={meta.id} size={52} />
        {medal && <MedalBadge medal={medal} />}
      </span>
      <span className="game-card__name">{meta.name}</span>
      <span className="game-card__domain">{meta.duration}</span>
      <span className="game-card__progress">
        <span className="mini-bar" aria-hidden="true">
          <span style={{ transform: `scaleX(${unlocked / MAX_LEVEL})` }} />
        </span>
        <span className="game-card__meta">
          <span>
            Niv. {unlocked}/{MAX_LEVEL}
          </span>
          <span className="game-card__stars">
            <Icon name="star" size={13} />
            {played ? stars : 0}
          </span>
        </span>
      </span>
    </button>
  );
}
