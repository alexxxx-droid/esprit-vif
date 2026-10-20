import { useEffect } from 'react';
import { track } from '../../analytics/journal';
import { tr } from '../../core/lang';
import type { TestBackend, TestScenario } from '../../premium/billing';
import { premiumBenefits } from '../../premium/catalog';
import type { Notice, PremiumState } from '../../premium/premium';
import { Icon } from '../components/Icon';
import { Mascot } from '../components/Mascot';
import { premiumController, usePremiumState } from '../premium';
import { navigate } from '../router';

function close() {
  if (history.length > 1) history.back();
  else navigate({ name: 'settings' }, { replace: true });
}

const NOTICES: Record<Exclude<Notice, null>, { tone: 'good' | 'info' | 'bad'; text: () => string }> = {
  purchased: { tone: 'good', text: () => tr('Merci ! Premium est activé sur cet appareil.', 'Thank you! Premium is now active on this device.') },
  restored: { tone: 'good', text: () => tr('Ton achat est retrouvé : Premium est activé.', 'Your purchase was found: Premium is active.') },
  pending: {
    tone: 'info',
    text: () =>
      tr(
        'Paiement en attente : Premium s’activera tout seul dès que Google Play l’aura confirmé.',
        'Payment pending: Premium will switch on by itself as soon as Google Play confirms it.',
      ),
  },
  cancelled: { tone: 'info', text: () => tr('Achat annulé : rien n’a été débité.', 'Purchase cancelled: you weren’t charged.') },
  'nothing-to-restore': {
    tone: 'info',
    text: () => tr('Aucun achat Premium sur ce compte Google Play.', 'No Premium purchase on this Google Play account.'),
  },
  network: {
    tone: 'bad',
    text: () => tr('Google Play ne répond pas. Vérifie ta connexion, puis réessaie.', 'Google Play isn’t responding. Check your connection, then try again.'),
  },
  error: { tone: 'bad', text: () => tr('L’achat n’a pas abouti. Rien n’a été débité ; tu peux réessayer.', 'The purchase didn’t go through. You weren’t charged; you can try again.') },
};

/** Esprit Vif Premium : un achat unique, sobre, avec ce qu'il apporte vraiment et ce qui reste gratuit. */
export function PremiumScreen() {
  const state = usePremiumState();
  const controller = premiumController();

  useEffect(() => {
    track('premium_viewed');
    return () => controller.dismissNotice();
  }, [controller]);

  return (
    <div className="screen screen-in premium">
      <header className="premium__top">
        <button type="button" className="icon-btn" onClick={close} aria-label={tr('Fermer', 'Close')}>
          <Icon name="close" />
        </button>
      </header>

      <section className="premium__hero">
        <Mascot mood={state.premium ? 'cheer' : 'hello'} size={96} hat={state.premium ? 'couronne' : undefined} />
        <h1 className="premium__title">Esprit Vif Premium</h1>
        <p className="premium__tagline">
          {tr('Un seul achat, pour toujours. Pas d’abonnement, pas de publicité.', 'One purchase, forever. No subscription, no ads.')}
        </p>
      </section>

      <ul className="premium__benefits">
        {premiumBenefits().map((b) => (
          <li key={b.id}>
            <span className="premium__benefit-icon" aria-hidden="true">
              <Icon name={b.icon} size={20} />
            </span>
            <span>
              <strong>{b.title}</strong>
              <span className="premium__benefit-text">{b.text}</span>
            </span>
          </li>
        ))}
      </ul>

      <Purchase state={state} />

      <section className="card premium__free" aria-labelledby="free-title">
        <h2 className="section-title" id="free-title">
          {tr('Gratuit, et ça le restera', 'Free, and it’ll stay that way')}
        </h2>
        <p className="card__sub">
          {tr(
            'Les 28 jeux et leurs 1 400 niveaux, le test du jour, les objectifs, le vestiaire, les thèmes gagnés en jouant, tes statistiques et tes sauvegardes. Rien de ce qui est gratuit aujourd’hui ne deviendra payant.',
            'All 28 games and their 1,400 levels, the daily test, goals, the wardrobe, themes earned by playing, your stats and backups. Nothing free today will ever become paid.',
          )}
        </p>
      </section>

      {state.test && <TestPanel />}
    </div>
  );
}

/** Le résultat du dernier achat ou de la dernière restauration, juste à côté des boutons. */
function NoticeLine({ notice }: { notice: Notice }) {
  if (!notice) return null;
  const { tone, text } = NOTICES[notice];
  return (
    <p className={`notice premium__notice premium__notice--${tone}`} role="status">
      <Icon name={tone === 'good' ? 'check' : 'info'} size={20} />
      {text()}
    </p>
  );
}

function Purchase({ state }: { state: PremiumState }) {
  const controller = premiumController();
  if (state.premium) {
    return (
      <section className="premium__buy">
        <NoticeLine notice={state.notice} />
        <p className="premium__owned">
          <Icon name="check" size={20} strokeWidth={3} />
          {tr('Premium est actif. Merci de soutenir Esprit Vif !', 'Premium is active. Thanks for supporting Esprit Vif!')}
        </p>
      </section>
    );
  }
  if (state.shop === 'web') {
    return (
      <section className="premium__buy">
        <p className="premium__info">
          {tr(
            'Premium s’achète dans l’appli Android, sur Google Play. Sur ce site, tout le reste est gratuit.',
            'Premium is sold in the Android app, on Google Play. On this website, everything else is free.',
          )}
        </p>
      </section>
    );
  }
  if (state.shop === 'not-configured') {
    return (
      <section className="premium__buy">
        <p className="premium__info">
          {tr(
            'Premium arrive bientôt : la boutique Google Play de l’appli n’est pas encore ouverte.',
            'Premium is coming soon: the app’s Google Play store isn’t open yet.',
          )}
        </p>
      </section>
    );
  }
  const ready = state.shop === 'ready';
  const price = state.product?.price;
  return (
    <section className="premium__buy">
      <button type="button" className="btn btn--primary btn--lg premium__cta" disabled={!ready || !price || state.busy !== null} onClick={() => void controller.buy()}>
        {state.busy === 'buy'
          ? tr('Ouverture de Google Play…', 'Opening Google Play…')
          : price
            ? tr(`Acheter pour ${price}`, `Buy for ${price}`)
            : state.shop === 'checking'
              ? tr('Chargement du prix…', 'Loading price…')
              : tr('Prix indisponible', 'Price unavailable')}
      </button>
      <p className="premium__fine">
        {ready && !price
          ? tr('Google Play ne donne pas encore le prix de Premium. Réessaie plus tard.', 'Google Play hasn’t provided Premium’s price yet. Try again later.')
          : state.shop === 'network' || state.shop === 'unavailable'
            ? tr('Google Play est injoignable pour le moment : les jeux, eux, marchent sans.', 'Google Play can’t be reached right now: the games work fine without it.')
            : tr('Paiement unique géré par Google Play. Premium suit ton compte Google sur tes appareils Android.', 'One-time payment handled by Google Play. Premium follows your Google account across your Android devices.')}
      </p>
      <NoticeLine notice={state.notice} />
      {state.pending && state.notice !== 'pending' && (
        <p className="premium__fine">{tr('Un paiement attend la confirmation de Google Play.', 'A payment is waiting for Google Play to confirm it.')}</p>
      )}
      <button type="button" className="btn btn--ghost" disabled={state.busy !== null} onClick={() => void controller.restore()}>
        {state.busy === 'restore' ? tr('Vérification…', 'Checking…') : tr('Restaurer mes achats', 'Restore purchases')}
      </button>
    </section>
  );
}

const SCENARIOS: { id: TestScenario; label: string }[] = [
  { id: 'success', label: 'Réussi' },
  { id: 'pending', label: 'En attente' },
  { id: 'cancel', label: 'Annulé' },
  { id: 'error', label: 'Erreur réseau' },
  { id: 'already-owned', label: 'Déjà acheté' },
];

/** Mode test (développement seulement) : choisir la réponse de la boutique, sans aucun achat réel. */
function TestPanel() {
  const backend = premiumController().backend as TestBackend;
  return (
    <section className="card premium__test" aria-label="Mode test">
      <p className="premium__test-title">MODE TEST — aucun achat réel</p>
      <div className="premium__test-row">
        {SCENARIOS.map((s) => (
          <button key={s.id} type="button" className="btn btn--sm" onClick={() => (backend.scenario = s.id)}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="premium__test-row">
        <button type="button" className="btn btn--sm" onClick={() => backend.settlePending()}>
          Confirmer l’attente
        </button>
        <button type="button" className="btn btn--sm" onClick={() => backend.refund()}>
          Rembourser
        </button>
      </div>
    </section>
  );
}
