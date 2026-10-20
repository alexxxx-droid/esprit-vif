import { useState, type CSSProperties } from 'react';
import { dailyGames } from '../../core/daily';
import { DAILY_POOL, DOMAIN_ORDER, GAME_ORDER, GAMES } from '../../core/games/registry';
import type { CharacterId } from '../../core/characters';
import { byCount } from '../../core/format';
import { tr } from '../../core/lang';
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
  const games = dailyGames(today, DAILY_POOL);

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
      <div className="welcome__steps" aria-label={tr(`Étape ${step + 1} sur 3`, `Step ${step + 1} of 3`)}>
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
            <h1 className="intro__title">{tr('Bienvenue sur Esprit Vif\u00a0!', 'Welcome to Esprit Vif!')}</h1>
            <p className="intro__rule">
              {tr(
                `Quelques minutes par jour, ${GAME_ORDER.length} mini-jeux et ton âge cérébral pour suivre tes progrès. Choisis ton compagnon et faisons connaissance\u00a0!`,
                `A few minutes a day, ${GAME_ORDER.length} mini-games and your brain age to track your progress. Pick your companion and let’s get to know each other!`,
              )}
            </p>
          </div>
          <label className="field">
            <span className="field__label">{tr('Ton prénom', 'Your first name')}</span>
            <input className="field__input" value={name} maxLength={16} placeholder={tr('Prénom', 'First name')} onChange={(e) => setName(e.target.value)} />
          </label>
          <span className="field__label">{tr('Ton compagnon', 'Your companion')}</span>
          <CharacterPicker value={character} onChange={setCharacter} />
          <span className="field__label">{tr('Ta couleur', 'Your color')}</span>
          <ColorPicker value={color} onChange={setColor} label={tr('Couleur de ton avatar', 'Your avatar color')} />
          <button type="button" className="cta welcome__cta" onClick={() => void saveProfile()}>
            <span className="cta__text">
              <span className="cta__label">{tr('Continuer', 'Continue')}</span>
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
            <h1 className="intro__title">{tr('Qu’as-tu envie de travailler\u00a0?', 'What would you like to work on?')}</h1>
            <p className="intro__rule">
              {tr(
                `Choisis jusqu’à ${MAX_GOALS} objectifs : ta séance du jour les mettra en avant. Tu pourras les changer dans les réglages.`,
                `Pick up to ${MAX_GOALS} goals: your daily session will focus on them. You can change them in Settings.`,
              )}
            </p>
          </div>
          <div className="goals" role="group" aria-label={tr('Objectifs', 'Goals')}>
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
              <span className="cta__label">{goals.length ? tr('Continuer', 'Continue') : tr('Passer', 'Skip')}</span>
              <span className="cta__sub">
                {goals.length
                  ? tr(byCount(goals.length, `${goals.length} objectif`, `${goals.length} objectifs`), byCount(goals.length, `${goals.length} goal`, `${goals.length} goals`))
                  : tr('Tout travailler un peu', 'A bit of everything')}
              </span>
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
            <h1 className="intro__title">{tr('Ton bilan de départ', 'Your starting assessment')}</h1>
            <p className="intro__rule">
              {tr(
                'Trois mini-jeux, environ trois minutes : ils te donnent ton âge cérébral de départ et ouvrent d’emblée les niveaux où tu es déjà à l’aise.',
                'Three mini-games, about three minutes: they give you your starting brain age and unlock right away the levels you’re already comfortable with.',
              )}
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
            {tr('L’âge cérébral est un indicateur ludique, pas une mesure médicale.', 'Brain age is a playful indicator, not a medical measure.')}
          </p>
          <div className="welcome__actions">
            <button type="button" className="cta" onClick={() => void finish(true)} disabled={busy}>
              <span className="cta__text">
                <span className="cta__label">{tr('Commencer le bilan', 'Start the assessment')}</span>
                <span className="cta__sub">{tr('3 jeux · environ 3 minutes', '3 games · about 3 minutes')}</span>
              </span>
              <span className="cta__icon">
                <Icon name="play" />
              </span>
            </button>
            <button type="button" className="btn btn--lg btn--ghost" onClick={() => void finish(false)} disabled={busy}>
              {tr('Plus tard', 'Later')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
