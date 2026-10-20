import { useState } from 'react';
import { characterName } from '../../core/characters';
import { tr } from '../../core/lang';
import { SPARKS } from '../../core/objectives';
import { purchaseBlocker, type HatId, type HatStatus } from '../../core/wardrobe';
import { Icon } from '../components/Icon';
import { Mascot } from '../components/Mascot';
import { fx } from '../fx/fx';
import { useProfiles } from '../profiles-context';
import { useProgress, useStore } from '../progress-context';
import { navigate } from '../router';
import { useWardrobe } from '../wardrobe';

function goBack() {
  if (history.length > 1) history.back();
  else navigate({ name: 'home' }, { replace: true });
}

/** Le vestiaire de Vif : choisir un chapeau, l'acheter avec ses étincelles, ou viser un chapeau de prestige. */
export function WardrobeScreen() {
  const data = useProgress();
  const store = useStore();
  const status = useWardrobe();
  const { active } = useProfiles();
  const worn = data.settings.hat || null;
  const [selected, setSelected] = useState<HatId | null>(worn ?? status.nextShop?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cheer, setCheer] = useState(false);
  const hat = status.hats.find((h) => h.id === selected) ?? null;
  const name = characterName(active.character);

  const wear = async (id: HatId | '') => {
    await store.updateSettings({ hat: id });
    fx.tap();
  };

  const buy = async (id: HatId) => {
    setBusy(true);
    setError(null);
    try {
      await store.buyHat(id);
      await store.updateSettings({ hat: id });
      fx.record();
      setCheer(true);
      window.setTimeout(() => setCheer(false), 1600);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const shop = status.hats.filter((h) => h.kind === 'shop');
  const prestige = status.hats.filter((h) => h.kind === 'prestige');

  return (
    <div className="screen screen-in wardrobe">
      <header className="theme-head">
        <button type="button" className="icon-btn" onClick={goBack} aria-label={tr('Retour', 'Back')}>
          <Icon name="back" />
        </button>
        <div>
          <h1 className="screen-title">{tr(`Le vestiaire de ${name}`, `${name}’s wardrobe`)}</h1>
          <p className="screen-subtitle">{tr('Des chapeaux pour le plaisir des yeux : ils ne changent rien aux jeux.', 'Hats just for fun: they don’t change the games.')}</p>
        </div>
      </header>

      <section className="wardrobe__stage" aria-live="polite">
        <Mascot mood={cheer ? 'cheer' : 'happy'} size={148} hat={selected} />
        <p className="wardrobe__balance">
          <Icon name="spark" size={20} />
          <strong>{status.balance}</strong> {tr('étincelles', 'sparks')}
        </p>
        {hat && <HatActions hat={hat} worn={worn === hat.id} balance={status.balance} busy={busy} onWear={wear} onBuy={buy} blocker={purchaseBlocker(status, hat.id)} />}
        {error && (
          <p className="notice" role="alert">
            <Icon name="info" size={20} />
            {error}
          </p>
        )}
      </section>

      <HatGrid title={tr('La boutique', 'The shop')} hats={shop} selected={selected} worn={worn} onSelect={setSelected} />
      <HatGrid title={tr('Prestige', 'Prestige')} subtitle={tr('Ils ne s’achètent pas : ils se méritent.', 'These can’t be bought: they’re earned.')} hats={prestige} selected={selected} worn={worn} onSelect={setSelected} />

      <section className="wardrobe__how" aria-labelledby="how-title">
        <h2 className="section-title" id="how-title">
          {tr('Gagner des étincelles', 'Earning sparks')}
        </h2>
        <ul className="wardrobe__rules">
          <li>{tr(`Chaque partie : 1 à 5 selon le score (jusqu’à ${SPARKS.playsPerDay} par jour)`, `Each game: 1 to 5 depending on your score (up to ${SPARKS.playsPerDay} a day)`)}</li>
          <li>{tr(`Test du jour : ${SPARKS.test}`, `Daily test: ${SPARKS.test}`)}</li>
          <li>{tr(`Chaque objectif du jour : ${SPARKS.objective}`, `Each daily goal: ${SPARKS.objective}`)}</li>
          <li>{tr(`Défi de la semaine : ${SPARKS.weekly}`, `Weekly challenge: ${SPARKS.weekly}`)}</li>
        </ul>
        <p className="wardrobe__note">{tr('Les étincelles ne s’achètent pas et ne se perdent jamais.', 'Sparks can’t be bought and are never lost.')}</p>
      </section>
    </div>
  );
}

interface HatActionsProps {
  hat: HatStatus;
  worn: boolean;
  balance: number;
  busy: boolean;
  blocker: string | null;
  onWear: (id: HatId | '') => void;
  onBuy: (id: HatId) => void;
}

function HatActions({ hat, worn, busy, blocker, onWear, onBuy }: HatActionsProps) {
  return (
    <div className="wardrobe__actions">
      <p className="wardrobe__name">{hat.name}</p>
      {hat.owned ? (
        worn ? (
          <button type="button" className="btn btn--lg btn--ghost" onClick={() => onWear('')}>
            {tr('Retirer', 'Take off')}
          </button>
        ) : (
          <button type="button" className="btn btn--lg btn--primary" onClick={() => onWear(hat.id)}>
            {tr('Porter', 'Wear')}
          </button>
        )
      ) : hat.kind === 'shop' ? (
        <>
          <button type="button" className="btn btn--lg btn--primary" disabled={busy || blocker !== null} onClick={() => onBuy(hat.id)}>
            {tr('Acheter', 'Buy')} · {hat.price} <Icon name="spark" size={16} />
          </button>
          {blocker && <p className="wardrobe__hint">{blocker}</p>}
        </>
      ) : (
        <p className="wardrobe__hint">
          <Icon name="lock" size={16} /> {hat.rule}
          {hat.progress && ` · ${hat.progress[0]} / ${hat.progress[1]}`}
        </p>
      )}
    </div>
  );
}

interface HatGridProps {
  title: string;
  subtitle?: string;
  hats: HatStatus[];
  selected: HatId | null;
  worn: HatId | null;
  onSelect: (id: HatId) => void;
}

function HatGrid({ title, subtitle, hats, selected, worn, onSelect }: HatGridProps) {
  const id = `hats-${title}`;
  return (
    <section aria-labelledby={id}>
      <h2 className="section-title" id={id}>
        {title} <span className="wardrobe__count">{`${hats.filter((h) => h.owned).length} / ${hats.length}`}</span>
      </h2>
      {subtitle && <p className="wardrobe__sub">{subtitle}</p>}
      <div className="hat-grid">
        {hats.map((hat) => {
          const state = worn === hat.id ? tr('porté', 'worn') : hat.owned ? tr('à toi', 'yours') : hat.kind === 'shop' ? tr(`${hat.price} étincelles`, `${hat.price} sparks`) : hat.rule;
          return (
            <button
              key={hat.id}
              type="button"
              className={`hat-tile${hat.owned ? ' is-owned' : ''}${selected === hat.id ? ' is-selected' : ''}${hat.kind === 'prestige' && !hat.owned ? ' is-locked' : ''}`}
              aria-pressed={selected === hat.id}
              aria-label={`${hat.name}, ${state}`}
              onClick={() => onSelect(hat.id)}
            >
              <Mascot size={58} hat={hat.id} still />
              <span className="hat-tile__name">{hat.name}</span>
              <span className="hat-tile__meta" aria-hidden="true">
                {worn === hat.id ? (
                  <>
                    <Icon name="check" size={13} strokeWidth={3} /> {tr('Porté', 'Worn')}
                  </>
                ) : hat.owned ? (
                  tr('À toi', 'Yours')
                ) : hat.kind === 'shop' ? (
                  <>
                    <Icon name="spark" size={12} /> {hat.price}
                  </>
                ) : (
                  <>
                    <Icon name="lock" size={12} />
                    {hat.progress ? ` ${hat.progress[0]}/${hat.progress[1]}` : ''}
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
