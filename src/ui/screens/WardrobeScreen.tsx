import { useState } from 'react';
import { characterName } from '../../core/characters';
import { localized, tr } from '../../core/lang';
import { AURAS } from '../../core/progression';
import { SPARKS } from '../../core/objectives';
import { purchaseBlocker, type HatId, type HatStatus } from '../../core/wardrobe';
import { Icon } from '../components/Icon';
import { Mascot } from '../components/Mascot';
import { fx } from '../fx/fx';
import { useProgress, useStore } from '../progress-context';
import { navigate } from '../router';
import { useProgression } from '../progression';
import { useWardrobe } from '../wardrobe';
import { useActiveCharacter } from '../characters-context';

function goBack() {
  if (history.length > 1) history.back();
  else navigate({ name: 'home' }, { replace: true });
}

/** Le vestiaire de Vif : choisir un chapeau, l'acheter avec ses étincelles, ou viser un chapeau de prestige. */
export function WardrobeScreen() {
  const data = useProgress();
  const store = useStore();
  const status = useWardrobe();
  const worn = data.settings.hat || null;
  const [selected, setSelected] = useState<HatId | null>(worn ?? status.nextShop?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cheer, setCheer] = useState(false);
  const hat = status.hats.find((h) => h.id === selected) ?? null;
  const name = characterName(useActiveCharacter());

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
  const premiumHats = status.hats.filter((h) => h.kind === 'premium');
  const premium = premiumHats.some((h) => h.owned);

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
        {/* Il essaie chaque chapeau choisi : un petit bond et un salut (la clé relance le geste). */}
        <Mascot key={selected ?? 'tete-nue'} mood={cheer ? 'cheer' : 'hello'} size={148} hat={selected} />
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
      <HatGrid
        title={tr('Collection Premium', 'Premium collection')}
        subtitle={
          premium
            ? tr('Merci de soutenir Esprit Vif : ils sont tous à toi.', 'Thanks for supporting Esprit Vif: they’re all yours.')
            : tr('Huit chapeaux qui scintillent, inclus dans Esprit Vif Premium. Touche-les pour les essayer sur Vif.', 'Eight sparkling hats, included with Esprit Vif Premium. Tap one to try it on Vif.')
        }
        hats={premiumHats}
        selected={selected}
        worn={worn}
        onSelect={setSelected}
      />

      <AuraPicker />

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
      ) : hat.kind === 'premium' ? (
        <>
          <button type="button" className="btn btn--lg btn--primary" onClick={() => navigate({ name: 'premium' })}>
            <Icon name="spark" size={18} />
            {tr('Avec Esprit Vif Premium', 'With Esprit Vif Premium')}
          </button>
          <p className="wardrobe__hint">{tr('Essai gratuit ici : il ne le gardera qu’avec Premium.', 'Try it here for free: it stays only with Premium.')}</p>
        </>
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
              className={`hat-tile${hat.owned ? ' is-owned' : ''}${selected === hat.id ? ' is-selected' : ''}${hat.kind === 'prestige' && !hat.owned ? ' is-locked' : ''}${hat.kind === 'premium' ? ' hat-tile--premium' : ''}`}
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
                ) : hat.kind === 'premium' ? (
                  <>
                    <Icon name="lock" size={12} /> Premium
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

/** Les auras de Vif : un halo gagné aux grands niveaux de joueur (60, 75, 100). */
function AuraPicker() {
  const data = useProgress();
  const store = useStore();
  const { rank } = useProgression();
  const current = data.settings.aura || null;
  return (
    <section aria-labelledby="aura-title">
      <h2 className="section-title" id="aura-title">
        {tr('Auras', 'Auras')} <span className="wardrobe__count">{`${AURAS.filter((a) => rank.level >= a.level).length} / ${AURAS.length}`}</span>
      </h2>
      <p className="wardrobe__sub">{tr('Elles s’allument aux grands niveaux de joueur, au-delà du 50.', 'They light up at high player levels, beyond 50.')}</p>
      <div className="hat-grid">
        {AURAS.map((a) => {
          const owned = rank.level >= a.level;
          const on = current === a.id;
          return (
            <button
              key={a.id}
              type="button"
              className={`hat-tile${owned ? ' is-owned' : ' is-locked'}${on ? ' is-selected' : ''}`}
              aria-pressed={on}
              aria-label={`${localized(a.name)}, ${owned ? (on ? tr('portée', 'worn') : tr('à toi', 'yours')) : tr(`niveau ${a.level}`, `level ${a.level}`)}`}
              onClick={() => owned && void store.updateSettings({ aura: on ? '' : a.id })}
            >
              <Mascot size={58} aura={a.id} hat={null} still={!owned} />
              <span className="hat-tile__name">{localized(a.name)}</span>
              <span className="hat-tile__meta" aria-hidden="true">
                {on ? tr('Portée', 'Worn') : owned ? tr('À toi', 'Yours') : (
                  <>
                    <Icon name="lock" size={12} /> {tr(`Niv. ${a.level}`, `Lv. ${a.level}`)}
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
