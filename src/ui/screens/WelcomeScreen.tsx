import { useState, type CSSProperties } from 'react';
import { dailyGames } from '../../core/daily';
import { DAILY_ROTATION, DOMAIN_ORDER, GAMES } from '../../core/games/registry';
import type { CharacterId } from '../../core/characters';
import type { Domain, GameId } from '../../core/types';
import { DomainBadge } from '../components/bits';
import { GameArt } from '../components/GameArt';
import { Mascot } from '../components/Mascot';
import { Icon } from '../components/Icon';
import { CharacterPicker, ColorPicker } from '../components/Players';
import { GOAL_LABELS, MAX_GOALS, toggleGoal } from '../goals';
import { useToday } from '../hooks';
import { useProfileManager, useProfiles } from '../profiles-context';
import { useProgress, useStore } from '../progress-context';
import { navigate } from '../router';

const HERO_GAMES: GameId[] = ['matrice', 'calcul', 'rotation', 'stroop', 'anagrammes'];

/** Premier lancement : prénom, objectifs, puis le bilan de départ (le premier test du jour). */
export function WelcomeScreen() {
  const data = useProgress();
  const store = useStore();
  const manager = useProfileManager();
  const { active } = useProfiles();
  const today = useToday();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(active.name);
  const [color, setColor] = useState(active.color);
  const [character, setCharacter] = useState<CharacterId>(active.character);
  const [goals, setGoals] = useState<Domain[]>(data.settings.goals);
  const [busy, setBusy] = useState(false);
  const games = dailyGames(today, DAILY_ROTATION);

  const saveProfile = async () => {
    if (name.trim() !== active.name || color !== active.color || character !== active.character) await manager.update(active.id, { name, color, character });
    setStep(1);
  };

  const finish = async (startTest: boolean) => {
    setBusy(true);
    await store.updateSettings({ onboarded: true, goals });
    if (startTest) {
      await store.startTest(games);
      navigate({ name: 'test' });
    }
  };

  return (
    <div className="screen screen-in welcome">
      <div className="welcome__steps" aria-label={`Étape ${step + 1} sur 3`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={i <= step ? 'is-on' : undefined} />
        ))}
      </div>

      {step === 0 && (
        <>
          <div className="welcome__fan" aria-hidden="true">
            {HERO_GAMES.map((id, i) => (
              <span key={id} style={{ '--i': i - 2 } as CSSProperties}>
                <GameArt gameId={id} size={74} />
              </span>
            ))}
            <Mascot key={character} character={character} mood="hello" size={96} className="welcome__vif" />
          </div>
          <div className="intro__head">
            <h1 className="intro__title">Bienvenue sur Esprit Vif&nbsp;!</h1>
            <p className="intro__rule">
              Quelques minutes par jour, 24 mini-jeux et ton âge cérébral pour suivre tes progrès. Choisis ton compagnon et faisons connaissance&nbsp;!
            </p>
          </div>
          <label className="field">
            <span className="field__label">Ton prénom</span>
            <input className="field__input" value={name} maxLength={16} placeholder="Prénom" onChange={(e) => setName(e.target.value)} />
          </label>
          <span className="field__label">Ton compagnon</span>
          <CharacterPicker value={character} onChange={setCharacter} />
          <span className="field__label">Ta couleur</span>
          <ColorPicker value={color} onChange={setColor} label="Couleur de ton avatar" />
          <button type="button" className="cta welcome__cta" onClick={() => void saveProfile()}>
            <span className="cta__text">
              <span className="cta__label">Continuer</span>
            </span>
            <span className="cta__icon">
              <Icon name="arrow" />
            </span>
          </button>
        </>
      )}

      {step === 1 && (
        <>
          <div className="intro__head">
            <h1 className="intro__title">Qu’as-tu envie de travailler&nbsp;?</h1>
            <p className="intro__rule">Choisis jusqu’à {MAX_GOALS} objectifs : ta séance du jour les mettra en avant. Tu pourras les changer dans les réglages.</p>
          </div>
          <div className="goals" role="group" aria-label="Objectifs">
            {DOMAIN_ORDER.map((domain) => {
              const on = goals.includes(domain);
              return (
                <button
                  key={domain}
                  type="button"
                  className={`goal${on ? ' is-on' : ''}`}
                  aria-pressed={on}
                  disabled={!on && goals.length >= MAX_GOALS}
                  onClick={() => setGoals(toggleGoal(goals, domain))}
                >
                  <DomainBadge domain={domain} size={40} />
                  <span>{GOAL_LABELS[domain]}</span>
                  {on && (
                    <span className="goal__check">
                      <Icon name="check" size={16} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <button type="button" className="cta welcome__cta" onClick={() => setStep(2)}>
            <span className="cta__text">
              <span className="cta__label">{goals.length ? 'Continuer' : 'Passer'}</span>
              <span className="cta__sub">{goals.length ? `${goals.length} objectif${goals.length > 1 ? 's' : ''}` : 'Tout travailler un peu'}</span>
            </span>
            <span className="cta__icon">
              <Icon name="arrow" />
            </span>
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="intro__head">
            <h1 className="intro__title">Ton bilan de départ</h1>
            <p className="intro__rule">
              Trois mini-jeux, environ trois minutes : ils te donnent ton âge cérébral de départ et ouvrent d’emblée les niveaux où tu es déjà à l’aise.
            </p>
          </div>
          <ol className="programme__list">
            {games.map((id) => (
              <li key={id} className="programme__item">
                <GameArt gameId={id} size={40} />
                <span className="programme__text">
                  <span className="programme__name">{GAMES[id].name}</span>
                  <span className="programme__domain">{GAMES[id].duration}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="disclaimer">
            <Icon name="info" size={18} />
            L’âge cérébral est un indicateur ludique, pas une mesure médicale.
          </p>
          <div className="welcome__actions">
            <button type="button" className="cta" onClick={() => void finish(true)} disabled={busy}>
              <span className="cta__text">
                <span className="cta__label">Commencer le bilan</span>
                <span className="cta__sub">3 jeux · environ 3 minutes</span>
              </span>
              <span className="cta__icon">
                <Icon name="play" />
              </span>
            </button>
            <button type="button" className="btn btn--lg btn--ghost" onClick={() => void finish(false)} disabled={busy}>
              Plus tard
            </button>
          </div>
        </>
      )}
    </div>
  );
}
