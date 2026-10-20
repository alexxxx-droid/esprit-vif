import { NBSP } from '../../core/format';
import { contrairesLevel, type Link } from '../../core/games/contraires';
import { tr } from '../../core/lang';
import { Icon } from '../components/Icon';
import { useLoop, useReducedMotion } from '../hooks';

/** L'image de la démo : animée, ou arrêtée sur `still` si le joueur a réduit les animations. */
function useDemoFrame(frames: number, intervalMs: number, still: number): number {
  const reduced = useReducedMotion();
  const frame = useLoop(frames, intervalMs, !reduced);
  return reduced ? still : frame;
}

function Tick({ show }: { show: boolean }) {
  return (
    <span className={`demo__tick${show ? ' is-on' : ''}`}>
      <Icon name="check" size={20} strokeWidth={3} />
    </span>
  );
}

/**
 * Deux questions : le contraire de « chaud », puis une seconde selon le palier (un autre contraire,
 * le même sens que « joyeux », ou le même sens avec « triste » en piège).
 */
function choiceDemo(level: number) {
  const c = contrairesLevel(level);
  const first = {
    ask: 'contraire' as const,
    word: tr('chaud', 'hot'),
    options: [tr('lent', 'slow'), tr('froid', 'cold'), tr('humide', 'wet'), tr('petit', 'small')],
    answer: 1,
    caption: tr('Froid, bien sûr', 'Cold, of course'),
  };
  if (!c.same)
    return [
      first,
      {
        ask: 'contraire' as const,
        word: tr('plein', 'full'),
        options: [tr('rapide', 'fast'), tr('gentil', 'kind'), tr('vide', 'empty'), tr('lourd', 'heavy')],
        answer: 2,
        caption: tr('Vide !', 'Empty!'),
      },
    ];
  return [
    first,
    {
      ask: 'synonyme' as const,
      word: tr('joyeux', 'happy'),
      options: [c.lure ? tr('triste', 'sad') : tr('lent', 'slow'), tr('lourd', 'heavy'), tr('propre', 'clean'), tr('gai', 'glad')],
      answer: 3,
      caption: c.lure ? tr(`Gai : «${NBSP}triste${NBSP}» était un piège`, 'Glad: “sad” was a trap') : tr('Gai : le même sens', 'Glad: same meaning'),
    },
  ];
}

function ChoiceDemo({ level }: { level: number }) {
  const frame = useDemoFrame(4, 1200, 1);
  const q = choiceDemo(level)[frame >> 1];
  const answered = frame % 2 === 1;
  return (
    <div className="demo">
      <div className={`demo-contraires demo-contraires--${q.ask}`}>
        <span className={`contraires__ask contraires__ask--${q.ask}`}>
          {q.ask === 'contraire' ? tr('Le contraire de', 'The opposite of') : tr('Le même sens que', 'Same meaning as')}
        </span>
        <span className="demo-contraires__word">{q.word}</span>
      </div>
      <div className="demo-contraires__options">
        {q.options.map((word, i) => (
          <span key={word} className={answered && i === q.answer ? 'is-picked' : undefined}>
            {word}
          </span>
        ))}
      </div>
      <p className="demo__caption">
        {answered ? q.caption : tr('Lis bien la consigne', 'Read the instruction')}
        <Tick show={answered} />
      </p>
    </div>
  );
}

const JUDGE_LINKS: readonly Link[] = ['contraire', 'synonyme', 'aucun'];

/** Palier Légende : « chaud » et « brûlant » ont le même sens ; « lent » et « propre » sont sans rapport. */
function JudgeDemo() {
  const frame = useDemoFrame(4, 1200, 1);
  const pairs = [
    { words: [tr('chaud', 'hot'), tr('brûlant', 'boiling')], link: 'synonyme' as const, caption: tr('Même sens !', 'Same meaning!') },
    { words: [tr('lent', 'slow'), tr('propre', 'clean')], link: 'aucun' as const, caption: tr('Sans rapport !', 'Unrelated!') },
  ];
  const q = pairs[frame >> 1];
  const answered = frame % 2 === 1;
  const names = { contraire: tr('Contraires', 'Opposites'), synonyme: tr('Même sens', 'Same meaning'), aucun: tr('Sans rapport', 'Unrelated') };
  return (
    <div className="demo">
      <div className="demo-contraires demo-contraires--judge">
        <span className="demo-contraires__word">{q.words[0]}</span>
        <span className="demo-contraires__word">{q.words[1]}</span>
      </div>
      <div className="demo-contraires__links">
        {JUDGE_LINKS.map((link) => (
          <span key={link} className={answered && link === q.link ? 'is-picked' : undefined}>
            {names[link]}
          </span>
        ))}
      </div>
      <p className="demo__caption">
        {answered ? q.caption : tr('Quel lien entre les deux ?', 'How are they linked?')}
        <Tick show={answered} />
      </p>
    </div>
  );
}

/** Démo de l'intro : la consigne en couleur puis la bonne proposition, ou, au palier Légende, une paire à juger. */
export function ContrairesDemo({ level }: { level: number }) {
  return contrairesLevel(level).judgeMs ? <JudgeDemo /> : <ChoiceDemo level={level} />;
}
