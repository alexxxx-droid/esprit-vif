import { useEffect, useEffectEvent, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { plural } from '../../core/format';
import {
  discAt,
  FILATURE_ARENA,
  FILATURE_CUE_MS,
  FILATURE_R,
  FILATURE_STEP_MS,
  FILATURE_TRIALS,
  filatureLevel,
  generateFilature,
  scoreFilature,
  type FilatureCloud,
} from '../../core/games/filature';
import { tr } from '../../core/lang';
import { createRng } from '../../core/rng';
import { FeedbackMark } from '../components/Feedback';
import { useFeedback } from '../components/feedback-state';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameHud } from '../game/Hud';
import { slow } from '../tempo';

type Phase = 'cue' | 'move' | 'answer' | 'reveal';

/** Le temps de voir le verdict d'un essai avant le suivant. */
const REVEAL_MS = 1300;
/** Un « click » qui suit un appui fait doublon (même règle que TapButton). */
const CLICK_AFTER_POINTER_MS = 800;

/** Un nuage : une forme ronde et opaque, sous laquelle les disques passent. */
export function Cloud({ cloud }: { cloud: FilatureCloud }) {
  const { x, y, w, h } = cloud;
  const r = h / 2;
  return (
    <g className="filature__cloud">
      <rect x={x} y={y + h * 0.25} width={w} height={h * 0.75} rx={r * 0.75} />
      <circle cx={x + w * 0.32} cy={y + h * 0.45} r={r * 0.62} />
      <circle cx={x + w * 0.62} cy={y + h * 0.38} r={r * 0.72} />
    </g>
  );
}

export function FilatureGame({ seed, level, onFinish }: GameProps) {
  const config = filatureLevel(level);
  const trials = useMemo(() => generateFilature(createRng(seed), level), [seed, level]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('cue');
  const [picked, setPicked] = useState<number[]>([]);
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [over, setOver] = useState(false);
  const [mark, showMark] = useFeedback();
  const discs = useRef<(SVGGElement | null)[]>([]);
  const lastPointer = useRef(-Infinity);
  const trial = trials[index];
  const lastStep = trial.frames.length - 1;
  const total = config.targets * FILATURE_TRIALS;

  const finish = useEffectEvent((finalCorrect: number, finalErrors: number) => {
    setOver(true);
    onFinish({
      score: scoreFilature(finalCorrect, finalErrors, level),
      stats: { correct: finalCorrect, errors: finalErrors },
      headline: `${tr(`${finalCorrect}/${total} retrouvés`, `${finalCorrect}/${total} found`)} · ${tr(plural(finalErrors, 'erreur'), plural(finalErrors, 'error'))}`,
      lines: [
        { label: tr('Disques retrouvés', 'Discs found'), value: `${finalCorrect} / ${total}` },
        { label: tr('Erreurs', 'Errors'), value: finalErrors ? String(finalErrors) : tr('Aucune', 'None') },
        { label: tr('Essais', 'Rounds'), value: String(FILATURE_TRIALS) },
      ],
    });
  });

  // Le signalement, puis le mouvement image par image, puis le verdict et l'essai suivant.
  useEffect(() => {
    if (over) return;
    if (phase === 'cue') {
      const id = window.setTimeout(() => setPhase('move'), slow(FILATURE_CUE_MS));
      return () => window.clearTimeout(id);
    }
    if (phase === 'reveal') {
      const id = window.setTimeout(() => {
        if (index + 1 >= FILATURE_TRIALS) {
          finish(correct, errors);
          return;
        }
        setIndex(index + 1);
        setPicked([]);
        setPhase('cue');
      }, REVEAL_MS);
      return () => window.clearTimeout(id);
    }
    if (phase !== 'move') return;
    // Le pas affiché dépend du temps écoulé, pas de la cadence : la simulation reste la même partout.
    const start = performance.now();
    let raf = 0;
    const draw = () => {
      const elapsed = performance.now() - start;
      const step = Math.min(lastStep, Math.floor(elapsed / FILATURE_STEP_MS));
      discs.current.forEach((node, disc) => {
        if (!node) return;
        const { x, y } = discAt(trial, step, disc);
        node.setAttribute('transform', `translate(${x} ${y})`);
        const lure = trial.lures.some((l) => l.disc === disc && elapsed >= l.at && elapsed < l.at + l.ms);
        node.classList.toggle('is-lure', lure);
      });
      if (step >= lastStep) {
        setPhase('answer');
        return;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [phase, index, over, trial, lastStep, correct, errors]);

  const pick = (disc: number) => {
    if (over || phase !== 'answer') return;
    if (picked.includes(disc)) {
      setPicked(picked.filter((d) => d !== disc));
      fx.tap();
      return;
    }
    const next = [...picked, disc];
    if (next.length < config.targets) {
      setPicked(next);
      fx.tap();
      return;
    }
    // Autant de choix que de disques à suivre : verdict de l'essai.
    const found = next.filter((d) => trial.targets.includes(d)).length;
    const wrong = config.targets - found;
    setPicked(next);
    setCorrect(correct + found);
    setErrors(errors + wrong);
    if (wrong === 0) {
      fx.good();
      showMark('good');
    } else {
      fx.bad();
      showMark('bad', tr(`${found} sur ${config.targets}`, `${found} of ${config.targets}`));
    }
    setPhase('reveal');
  };

  const onKey = (event: KeyboardEvent, disc: number) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    pick(disc);
  };

  // Hors du mouvement, les disques sont dessinés par React : au départ pendant le signalement, à l'arrivée ensuite.
  const shownStep = phase === 'cue' ? 0 : lastStep;
  const answering = phase === 'answer';

  const prompt =
    phase === 'cue'
      ? tr(`Retiens les ${config.targets} disques entourés`, `Remember the ${config.targets} circled discs`)
      : phase === 'move'
        ? tr('Suis-les des yeux…', 'Follow them with your eyes…')
        : phase === 'answer'
          ? tr(`Touche les ${config.targets} disques suivis · ${picked.length}/${config.targets}`, `Tap the ${config.targets} discs you followed · ${picked.length}/${config.targets}`)
          : tr('Les disques suivis sont entourés en vert.', 'The discs you had to follow are circled in green.');

  return (
    <div className="game">
      <GameHud progress={(index + (phase === 'reveal' ? 1 : 0)) / FILATURE_TRIALS} />
      <div className="game__stage filature">
        <p className="anagram__found">
          {tr('Essai', 'Round')} <strong>{index + 1}</strong> / {FILATURE_TRIALS}
        </p>
        <svg
          className={`filature__arena is-${phase}`}
          viewBox={`0 0 ${FILATURE_ARENA} ${FILATURE_ARENA}`}
          role="group"
          aria-label={tr('Arène des disques', 'Disc arena')}
        >
          {Array.from({ length: config.dots }, (_, disc) => {
            const { x, y } = discAt(trial, shownStep, disc);
            const target = trial.targets.includes(disc);
            const chosen = picked.includes(disc);
            const state =
              phase === 'cue' && target
                ? ' is-cued'
                : phase === 'reveal'
                  ? chosen
                    ? target
                      ? ' is-hit'
                      : ' is-wrong'
                    : target
                      ? ' is-missed'
                      : ''
                  : chosen
                    ? ' is-picked'
                    : '';
            return (
              <g
                key={`${index}-${disc}`}
                ref={(node) => {
                  discs.current[disc] = node;
                }}
                className={`filature__disc${state}`}
                transform={`translate(${x} ${y})`}
                role={answering ? 'button' : undefined}
                tabIndex={answering ? 0 : undefined}
                aria-pressed={answering ? chosen : undefined}
                aria-label={answering ? tr(`Disque ${disc + 1}`, `Disc ${disc + 1}`) : undefined}
                onPointerDown={(event) => {
                  if (event.pointerType === 'mouse' && event.button !== 0) return;
                  event.preventDefault();
                  lastPointer.current = event.timeStamp;
                  pick(disc);
                }}
                onClick={(event) => {
                  if (event.timeStamp - lastPointer.current < CLICK_AFTER_POINTER_MS) return;
                  pick(disc);
                }}
                onKeyDown={(event) => onKey(event, disc)}
              >
                <circle className="filature__ring" r={FILATURE_R + 2.4} />
                <circle className="filature__body" r={FILATURE_R} />
                {/* Zone de toucher un peu plus large que le disque. */}
                <circle className="filature__hit" r={FILATURE_R + 1.4} />
              </g>
            );
          })}
          {/* Les nuages arrivent avec le mouvement (au signalement, tout doit se voir) et partent à l'arrêt. */}
          {phase === 'move' && trial.clouds.map((cloud, i) => <Cloud key={`${index}-c${i}`} cloud={cloud} />)}
        </svg>
        <p className="lettre__ask filature__prompt" aria-live="polite">
          {prompt}
        </p>
        <FeedbackMark mark={mark} />
      </div>
    </div>
  );
}
