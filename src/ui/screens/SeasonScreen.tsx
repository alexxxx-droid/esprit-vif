import { addDays, dayIndex } from '../../core/daily';
import { challengeProgress, weeklyChallenge } from '../../core/events';
import { formatShortDay } from '../../core/format';
import { localized, tr } from '../../core/lang';
import { SPARKS } from '../../core/objectives';
import { seasonArc, seasonHatId, seasonHatName, seasonsEarned, seasonStatus, SEASON_REQUIRED } from '../../core/seasons';
import { Icon } from '../components/Icon';
import { Mascot } from '../components/Mascot';
import { useToday } from '../hooks';
import { useProgress } from '../progress-context';
import { navigate } from '../router';

const endSentence = (text: string) => (text.endsWith('.') ? text : `${text}.`);

function goBack() {
  if (history.length > 1) history.back();
  else navigate({ name: 'home' }, { replace: true });
}

/** La saison de défis en cours : quatre chapitres, un par semaine, et le chapeau à gagner. */
export function SeasonScreen() {
  const data = useProgress();
  const today = useToday();
  const arc = seasonArc(today);
  const status = seasonStatus(arc, data.plays, data.extras.sessions);
  const hatId = seasonHatId(arc);
  const done = status.done.filter(Boolean).length;
  const collection = seasonsEarned(data.plays, data.extras.sessions, today).length;
  const daysLeft = dayIndex(arc.end) - dayIndex(today) + 1;

  return (
    <div className="screen screen-in season-screen">
      <header className="theme-head">
        <button type="button" className="icon-btn" onClick={goBack} aria-label={tr('Retour', 'Back')}>
          <Icon name="back" />
        </button>
        <div>
          <h1 className="screen-title">{tr('Saison de défis', 'Challenge season')}</h1>
          <p className="screen-subtitle">
            {tr(`Du ${formatShortDay(arc.start)} au ${formatShortDay(arc.end)}`, `${formatShortDay(arc.start)} to ${formatShortDay(arc.end)}`)}
          </p>
        </div>
      </header>

      <section className={`season-hero season-hero--${arc.story.id}`}>
        <Mascot mood={status.earned ? 'cheer' : 'hello'} size={120} hat={hatId} />
        <h2 className="season-hero__title">{localized(arc.story.name)}</h2>
        <p className="season-hero__reward">
          {status.earned
            ? tr(`Saison réussie ! ${seasonHatName(hatId)} est dans ton vestiaire.`, `Season complete! ${seasonHatName(hatId)} is in your wardrobe.`)
            : tr(
                `${SEASON_REQUIRED} chapitres sur 4 : ${seasonHatName(hatId)} et ${SPARKS.season} étincelles. Encore ${daysLeft} jours.`,
                `${SEASON_REQUIRED} chapters out of 4: ${seasonHatName(hatId)} and ${SPARKS.season} sparks. ${daysLeft} days left.`,
              )}
        </p>
        <span className="season-hero__dots" aria-label={tr(`${done} chapitres sur 4`, `${done} of 4 chapters`)}>
          {status.done.map((d, i) => (
            <span key={i} className={d ? 'is-done' : i === arc.chapter ? 'is-current' : undefined} />
          ))}
        </span>
      </section>

      <ol className="chapters">
        {arc.story.chapters.map((chapter, i) => {
          const week = arc.weeks[i];
          const challenge = weeklyChallenge(week);
          const progress = Math.min(challenge.target, challengeProgress(challenge, data.plays, data.extras.sessions));
          const state = status.done[i] ? 'done' : i === arc.chapter ? 'current' : i < arc.chapter ? 'missed' : 'future';
          return (
            <li key={i} className={`chapter chapter--${state}`}>
              <span className="chapter__mark" aria-hidden="true">
                {state === 'done' ? <Icon name="check" size={18} strokeWidth={3} /> : state === 'future' ? <Icon name="lock" size={16} /> : i + 1}
              </span>
              <span className="chapter__text">
                <span className="chapter__title">
                  {tr(`Chapitre ${i + 1} · `, `Chapter ${i + 1} · `)}
                  {localized(chapter.title)}
                </span>
                {state !== 'future' && <span className="chapter__line">{localized(chapter.line)}</span>}
                <span className="chapter__meta">
                  {state === 'done' && tr('Défi de la semaine relevé', 'Weekly challenge done')}
                  {state === 'current' && `${challenge.label} · ${progress}/${challenge.target}`}
                  {state === 'missed' && tr('Manqué : pas grave, 3 chapitres suffisent.', 'Missed: no worries, 3 chapters are enough.')}
                  {state === 'future' && tr(`À partir du ${formatShortDay(week)}`, `From ${formatShortDay(week)}`)}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <button type="button" className="card card--action" onClick={() => navigate({ name: 'wardrobe' })}>
        <span className="card__icon">
          <Icon name="crown" />
        </span>
        <span className="card__text">
          <span className="card__title">{tr('Ta collection de saison', 'Your season collection')}</span>
          <span className="card__sub">
            {collection
              ? tr(`${collection} chapeau${collection > 1 ? 'x' : ''} de saison`, `${collection} season hat${collection > 1 ? 's' : ''}`)
              : tr('Le premier chapeau t’attend au bout de cette saison.', 'The first hat awaits at the end of this season.')}
          </span>
        </span>
        <Icon name="arrow" />
      </button>
      <p className="hint">
        {/* « 16 nov. » porte déjà son point : pas de second point en fin de phrase. */}
        {endSentence(
          tr(
            `Chaque saison dure quatre semaines ; la suivante commence le ${formatShortDay(addDays(arc.end, 1))}`,
            `Each season lasts four weeks; the next one starts on ${formatShortDay(addDays(arc.end, 1))}`,
          ),
        )}
      </p>
    </div>
  );
}
