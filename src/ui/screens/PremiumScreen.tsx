import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { track } from '../../analytics/journal';
import { PREMIUM_CHARACTERS } from '../../core/characters';
import { dayKey } from '../../core/daily';
import { formatDecimal, formatMonth } from '../../core/format';
import { GAME_ORDER, GAMES } from '../../core/games/registry';
import { MAX_LEVEL } from '../../core/levels';
import { tr } from '../../core/lang';
import { monthlyReport } from '../../core/summary';
import { THEMES, themeName, type ThemeId } from '../../core/themes';
import type { GameId } from '../../core/types';
import { HATS, hatName, type HatId } from '../../core/wardrobe';
import type { TestBackend, TestScenario } from '../../premium/billing';
import type { Notice, PremiumState } from '../../premium/premium';
import { GameArt } from '../components/GameArt';
import { Icon } from '../components/Icon';
import { Mascot } from '../components/Mascot';
import { ScoreChart } from '../components/ScoreChart';
import { SeasonDecor } from '../components/SeasonDecor';
import { useReducedMotion } from '../hooks';
import { premiumController, usePremiumState } from '../premium';
import { useProgress } from '../progress-context';
import { navigate } from '../router';
import { setThemePreview, useThemePreview } from '../theme-preview';

function close() {
  if (history.length > 1) history.back();
  else navigate({ name: 'settings' }, { replace: true });
}

const PREMIUM_THEMES = THEMES.filter((t) => t.unlock.kind === 'premium');
const PREMIUM_HATS = HATS.filter((h) => h.premium).map((h) => h.id);
/** Chapeaux qui se gagnent en jouant (boutique et prestige), hors saisons. */
const EARNED_HATS = HATS.filter((h) => !h.premium).length;

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

/**
 * Esprit Vif Premium : une vitrine où tout s'essaie (thèmes en direct, chapeaux sur Vif, compagnons),
 * avec les vraies données du joueur en aperçu, puis un achat unique. Jamais ouvert tout seul.
 */
export function PremiumScreen({ focus }: { focus?: string }) {
  const state = usePremiumState();
  const controller = premiumController();
  const preview = useThemePreview();
  const [hat, setHat] = useState<HatId>(PREMIUM_HATS[0]);

  useEffect(() => {
    track('premium_viewed', focus ? { focus } : undefined);
    if (focus && PREMIUM_THEMES.some((t) => t.id === focus)) setThemePreview(focus as ThemeId);
    return () => {
      controller.dismissNotice();
      // En quittant l'écran, le thème du joueur revient.
      setThemePreview(null);
    };
  }, [controller, focus]);

  return (
    <div className="screen screen-in premium">
      {preview === 'sakura' && <SeasonDecor decor="sakura" />}
      <header className="premium__top">
        {preview && (
          <p className="premium__preview-tag">
            <Icon name="sun" size={16} />
            {tr(`Aperçu : ${themeName(preview)}`, `Preview: ${themeName(preview)}`)}
          </p>
        )}
        <button type="button" className="icon-btn" onClick={close} aria-label={tr('Fermer', 'Close')}>
          <Icon name="close" />
        </button>
      </header>

      <Hero premium={state.premium} hat={hat} onHat={setHat} />

      <Purchase state={state} />

      <ThemeShowcase premium={state.premium} />
      <HatShowcase premium={state.premium} selected={hat} onSelect={setHat} />
      <CompanionShowcase premium={state.premium} />
      <HistoryTeaser premium={state.premium} />
      <MonthTeaser premium={state.premium} />

      <section className="card premium__free" aria-labelledby="free-title">
        <h2 className="section-title" id="free-title">
          {tr('Gratuit, et ça le restera', 'Free, and it’ll stay that way')}
        </h2>
        <p className="card__sub">
          {tr(
            `Les ${GAME_ORDER.length} jeux, leurs ${formatDecimal(GAME_ORDER.length * MAX_LEVEL)} niveaux et la maîtrise, le test du jour, les objectifs, les défis et les saisons, le vestiaire et ses ${EARNED_HATS} chapeaux à gagner, les thèmes gagnés en jouant, tes statistiques et tes sauvegardes. Rien de ce qui est gratuit aujourd’hui ne deviendra payant, et il n’y aura jamais de publicité.`,
            `All ${GAME_ORDER.length} games, their ${formatDecimal(GAME_ORDER.length * MAX_LEVEL)} levels and mastery, the daily test, goals, challenges and seasons, the wardrobe and its ${EARNED_HATS} hats to earn, themes earned by playing, your stats and backups. Nothing free today will ever become paid, and there will never be ads.`,
          )}
        </p>
      </section>

      {!state.premium && state.shop === 'ready' && state.product?.price && (
        <button type="button" className="btn btn--primary btn--lg" disabled={state.busy !== null} onClick={() => void controller.buy()}>
          {tr(`Tout débloquer pour ${state.product.price}`, `Unlock everything for ${state.product.price}`)}
        </button>
      )}

      {state.test && <TestPanel />}
    </div>
  );
}

/** Vif essaie un chapeau Premium après l'autre ; deux compagnons exclusifs l'entourent. */
function Hero({ premium, hat, onHat }: { premium: boolean; hat: HatId; onHat: (id: HatId) => void }) {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const id = window.setTimeout(() => onHat(PREMIUM_HATS[(PREMIUM_HATS.indexOf(hat) + 1) % PREMIUM_HATS.length]), 2200);
    return () => window.clearTimeout(id);
  }, [hat, onHat, reduced]);
  return (
    <section className="premium__hero">
      <div className="premium__stage" aria-hidden="true">
        <Mascot character="kiwi" mood="happy" size={58} className="premium__side premium__side--left" />
        <Mascot key={hat} mood={premium ? 'cheer' : 'wow'} size={112} hat={hat} character="vif" />
        <Mascot character="myrtille" mood="happy" size={58} className="premium__side premium__side--right" />
      </div>
      <h1 className="premium__title">Esprit Vif Premium</h1>
      <p className="premium__tagline">{tr('Un seul achat, pour toujours. Pas d’abonnement, pas de publicité.', 'One purchase, forever. No subscription, no ads.')}</p>
      <ul className="premium__chips">
        <li>{tr('3 thèmes', '3 themes')}</li>
        <li>{tr('8 chapeaux', '8 hats')}</li>
        <li>{tr('3 compagnons', '3 companions')}</li>
        <li>{tr('Historique', 'History')}</li>
        <li>{tr('Bilan du mois', 'Monthly recap')}</li>
      </ul>
    </section>
  );
}

function ThemeShowcase({ premium }: { premium: boolean }) {
  const preview = useThemePreview();
  return (
    <section className="premium__section" aria-labelledby="pt-title">
      <h2 className="section-title" id="pt-title">
        {tr('Trois thèmes exclusifs', 'Three exclusive themes')}
      </h2>
      <p className="premium__section-sub">
        {premium
          ? tr('Choisis-les dans Réglages → Apparence.', 'Pick them in Settings → Appearance.')
          : tr('Essaie-les en direct : toute l’appli change de couleurs le temps de l’aperçu.', 'Try them live: the whole app changes colors during the preview.')}
      </p>
      <div className="premium__themes">
        {PREMIUM_THEMES.map((t) => {
          const on = preview === t.id;
          return (
            <button
              key={t.id}
              type="button"
              className={`premium__theme${on ? ' is-on' : ''}`}
              style={{ '--sw-light': t.light, '--sw-dark': t.dark, '--sw-tint': t.tint } as CSSProperties}
              aria-pressed={on}
              onClick={() => setThemePreview(on ? null : t.id)}
            >
              <span className={`premium__theme-art premium__theme-art--${t.id}`} aria-hidden="true" />
              <span className="premium__theme-name">{themeName(t.id)}</span>
              <span className="premium__theme-action">{on ? tr('Arrêter l’essai', 'Stop preview') : tr('Essayer', 'Try it')}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function HatShowcase({ premium, selected, onSelect }: { premium: boolean; selected: HatId; onSelect: (id: HatId) => void }) {
  return (
    <section className="premium__section" aria-labelledby="ph-title">
      <h2 className="section-title" id="ph-title">
        {tr('Huit chapeaux qui scintillent', 'Eight sparkling hats')}
      </h2>
      <p className="premium__section-sub">
        {premium
          ? tr('Ils t’attendent dans le vestiaire.', 'They’re waiting in the wardrobe.')
          : tr('Touche un chapeau : Vif l’essaie là-haut. Sans étincelles, ils sont à toi d’un coup.', 'Tap a hat: Vif tries it on up top. No sparks needed, they’re all yours at once.')}
      </p>
      <div className="premium__hats">
        {PREMIUM_HATS.map((id) => (
          <button
            key={id}
            type="button"
            className={`premium__hat${selected === id ? ' is-on' : ''}`}
            aria-pressed={selected === id}
            aria-label={hatName(id)}
            onClick={() => {
              onSelect(id);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <Mascot size={52} hat={id} character="vif" still />
          </button>
        ))}
      </div>
    </section>
  );
}

function CompanionShowcase({ premium }: { premium: boolean }) {
  return (
    <section className="premium__section" aria-labelledby="pc-title">
      <h2 className="section-title" id="pc-title">
        {tr('Trois compagnons exclusifs', 'Three exclusive companions')}
      </h2>
      <p className="premium__section-sub">
        {premium
          ? tr('Choisis-les dans Réglages → Joueur.', 'Pick them in Settings → Player.')
          : tr('Ils rejoignent Vif et sa bande, avec les mêmes chapeaux et les mêmes humeurs.', 'They join Vif and the gang, with the same hats and moods.')}
      </p>
      <div className="premium__companions">
        {PREMIUM_CHARACTERS.map((c, i) => (
          <figure key={c.id} className="premium__companion">
            <Mascot character={c.id} mood={(['cheer', 'hello', 'happy'] as const)[i]} size={76} />
            <figcaption>{c.name}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/** Ta vraie courbe, floutée : l'historique détaillé se devine sans être montré. */
function HistoryTeaser({ premium }: { premium: boolean }) {
  const data = useProgress();
  const game = useMemo(() => {
    const count = new Map<GameId, number>();
    for (const p of data.plays) count.set(p.gameId, (count.get(p.gameId) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  }, [data.plays]);
  const points = useMemo(
    () => (game ? data.plays.filter((p) => p.gameId === game).map((p) => ({ day: p.day, score: p.score, level: p.level })) : []),
    [data.plays, game],
  );
  return (
    <section className="premium__section" aria-labelledby="phi-title">
      <h2 className="section-title" id="phi-title">
        {tr('L’historique détaillé de chaque jeu', 'Detailed history for every game')}
      </h2>
      <p className="premium__section-sub">
        {tr('Tous tes scores, ton meilleur score à chaque niveau, ta précision et ton temps de réaction au fil des parties.', 'All your scores, your best on every level, your accuracy and reaction time over time.')}
      </p>
      {game && points.length >= 2 ? (
        <div className={`teaser${premium ? '' : ' teaser--locked'}`}>
          <p className="teaser__game">
            <GameArt gameId={game} size={28} /> {GAMES[game].name}
          </p>
          <div className="teaser__content" aria-hidden={!premium}>
            <ScoreChart points={points} />
          </div>
          {premium ? (
            <button type="button" className="btn btn--ghost" onClick={() => navigate({ name: 'history', gameId: game })}>
              {tr('Ouvrir l’historique', 'Open the history')}
            </button>
          ) : (
            <p className="teaser__veil">
              <Icon name="lock" size={18} />
              {tr(`Ta courbe de ${GAMES[game].name} est prête : ${points.length} parties.`, `Your ${GAMES[game].name} chart is ready: ${points.length} games.`)}
            </p>
          )}
        </div>
      ) : (
        <p className="premium__section-sub">{tr('Ta courbe apparaîtra après quelques parties.', 'Your chart will appear after a few games.')}</p>
      )}
    </section>
  );
}

/** Ton vrai bilan du mois, flouté tant que Premium n'est pas là. */
function MonthTeaser({ premium }: { premium: boolean }) {
  const data = useProgress();
  const month = dayKey().slice(0, 7);
  const report = useMemo(() => monthlyReport(data.plays, data.tests, month), [data.plays, data.tests, month]);
  const name = formatMonth(`${month}-01`);
  return (
    <section className="premium__section" aria-labelledby="pm-title">
      <h2 className="section-title" id="pm-title">
        {tr('Ton bilan du mois', 'Your monthly recap')}
      </h2>
      <p className="premium__section-sub">
        {tr('Chaque mois, une carte illustrée de ta régularité, de tes records et de ton jeu préféré, à garder ou à partager.', 'Every month, an illustrated card of your consistency, best scores and favorite game, to keep or share.')}
      </p>
      {report.plays > 0 && (
        <div className={`teaser${premium ? '' : ' teaser--locked'}`}>
          <div className="teaser__content month-mini" aria-hidden={!premium}>
            <strong className="month-mini__title">{name}</strong>
            <span>
              <b>{report.plays}</b> {tr('parties', 'games')}
            </span>
            <span>
              <b>{report.days}</b> {tr('jours', 'days')}
            </span>
            <span>
              <b>{report.records}</b> {tr('records', 'best scores')}
            </span>
          </div>
          {premium ? (
            <button type="button" className="btn btn--ghost" onClick={() => navigate({ name: 'month' })}>
              {tr('Voir mon bilan', 'See my recap')}
            </button>
          ) : (
            <p className="teaser__veil">
              <Icon name="lock" size={18} />
              {tr(`Ton bilan de ${name} t’attend.`, `Your ${name} recap is waiting.`)}
            </p>
          )}
        </div>
      )}
    </section>
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
            'Premium s’achète dans l’appli Android, sur Google Play. Sur ce site, tout le reste est gratuit, et tout s’essaie ci-dessous.',
            'Premium is sold in the Android app, on Google Play. On this website, everything else is free, and you can try it all below.',
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
            'Premium arrive bientôt : la boutique Google Play de l’appli n’est pas encore ouverte. En attendant, tout s’essaie ci-dessous.',
            'Premium is coming soon: the app’s Google Play store isn’t open yet. Meanwhile, you can try everything below.',
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
