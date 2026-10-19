import { useState } from 'react';
import { dailyGames, hasOfficialTest } from '../../core/daily';
import { DAILY_ROTATION, DOMAINS, GAME_ORDER, GAMES, type GameMeta } from '../../core/games/registry';
import { bestFor, gameLevel } from '../../store/progress';
import { DomainBadge, ScreenHeader } from '../components/bits';
import { Icon } from '../components/Icon';
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
      <ScreenHeader title="Entraînement" subtitle="Joue autant que tu veux : chaque jeu s’adapte à ton niveau." />

      <div className="game-grid">
        {GAME_ORDER.map((id) => (
          <GameCard key={id} meta={GAMES[id]} level={gameLevel(data, id)} best={bestFor(data, id, gameLevel(data, id))?.score} />
        ))}
      </div>

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

function GameCard({ meta, level, best }: { meta: GameMeta; level: number; best?: number }) {
  return (
    <button type="button" className="game-card" onClick={() => navigate({ name: 'play', gameId: meta.id })}>
      <span className="game-card__top">
        <DomainBadge domain={meta.domain} />
        <span className="level-dots" role="img" aria-label={`Niveau ${level} sur ${meta.maxLevel}`}>
          {Array.from({ length: meta.maxLevel }, (_, i) => (
            <span key={i} className={i < level ? 'is-on' : undefined} />
          ))}
        </span>
      </span>
      <span className="game-card__name">{meta.name}</span>
      <span className="game-card__domain">
        {DOMAINS[meta.domain].name} · {meta.duration}
      </span>
      <span className="game-card__best">
        <Icon name="star" size={14} />
        {best !== undefined ? `Record ${best}` : 'Pas encore joué'}
      </span>
    </button>
  );
}
