import { useEffect, useEffectEvent, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { tr } from '../../core/lang';
import {
  AIGUILLAGES_MAX_MS,
  aiguillagesLevel,
  childOf,
  EXPRESS_FACTOR,
  generateAiguillages,
  isStation,
  scoreAiguillages,
  stationCount,
  stationIndex,
  switchCount,
  type AiguillagesLevel,
} from '../../core/games/aiguillages';
import { createRng } from '../../core/rng';
import { fx } from '../fx/fx';
import type { GameProps } from '../game/chrome';
import { GameHud } from '../game/Hud';
import { slow } from '../tempo';
import { layout, type Point } from './aiguillages-layout';
import { ShapeGlyph } from './echo-shapes';

interface Run {
  color: number;
  at: number;
  express: boolean;
  spawned: boolean;
  done: boolean;
  /** Le tronçon en cours : de `from` jusqu'au nœud `node`, commencé à `start`. */
  from: Point;
  node: number;
  start: number;
}

/** Le réseau : voies, aiguillages (le côté actif en couleur), gares et trains. */
export function Network({
  c,
  stations,
  switches,
  trains,
  flash,
  onSwitch,
}: {
  c: AiguillagesLevel;
  stations: readonly number[];
  switches: readonly number[];
  trains: readonly { key: number; color: number; express: boolean; at: Point }[];
  flash?: { station: number; ok: boolean } | null;
  onSwitch?: (node: number) => void;
}) {
  const { height, entry, pos } = layout(c);
  const n = switchCount(c);
  const glyph = stationCount(c) === 8 ? 5.4 : 9;
  const key = (e: KeyboardEvent, node: number) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    onSwitch?.(node);
  };
  return (
    <svg className="aig__net" viewBox={`0 0 100 ${height}`} role="group" aria-label={tr('Le réseau de voies', 'The rail network')}>
      <line className="aig__rail is-active" x1={entry[0]} y1={entry[1]} x2={pos(0)[0]} y2={pos(0)[1]} />
      {Array.from({ length: n }, (_, node) =>
        [0, 1].map((side) => {
          const [a, b] = [pos(node), pos(childOf(node, side))];
          return <line key={`${node}-${side}`} className={`aig__rail${switches[node] === side ? ' is-active' : ''}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />;
        }),
      )}
      <rect className="aig__tunnel" x={entry[0] - 7} y={0} width="14" height={entry[1] + 2} rx="3" />
      {stations.map((color, i) => {
        const [x, y] = pos(n + i);
        const state = flash?.station === i ? (flash.ok ? ' is-ok' : ' is-bad') : '';
        return (
          <g key={i} className={`aig__station echo__pad--${color}${state}`}>
            <rect x={x - glyph} y={y - 1} width={glyph * 2} height={glyph * 1.4} rx="2.5" />
            <svg x={x - glyph * 0.6} y={y - 0.2} width={glyph * 1.2} height={glyph * 1.2} viewBox="0 0 24 24" className="aig__glyph">
              <ShapeGlyph color={color} />
            </svg>
          </g>
        );
      })}
      {trains.map((t) => (
        <g key={t.key} className={`aig__train echo__pad--${t.color}${t.express ? ' is-express' : ''}`} transform={`translate(${t.at[0]} ${t.at[1]})`}>
          <circle r="5.2" />
          <svg x="-3.4" y="-3.4" width="6.8" height="6.8" viewBox="0 0 24 24" className="aig__glyph">
            <ShapeGlyph color={t.color} />
          </svg>
        </g>
      ))}
      {Array.from({ length: n }, (_, node) => {
        const [x, y] = pos(node);
        const [lx] = pos(childOf(node, switches[node]));
        return (
          <g
            key={node}
            className="aig__switch"
            transform={`translate(${x} ${y})`}
            role={onSwitch ? 'button' : undefined}
            tabIndex={onSwitch ? 0 : undefined}
            aria-label={onSwitch ? tr(`Aiguillage ${node + 1} : vers la ${switches[node] ? 'droite' : 'gauche'}`, `Switch ${node + 1}: to the ${switches[node] ? 'right' : 'left'}`) : undefined}
            onPointerDown={(e) => {
              if (!onSwitch) return;
              e.preventDefault();
              onSwitch(node);
            }}
            onKeyDown={(e) => key(e, node)}
          >
            <circle className="aig__switch-hit" r="9" />
            <circle className="aig__switch-dot" r="4.6" />
            <path className="aig__switch-arrow" d="M0 0 0 3.2" transform={`rotate(${lx < x ? 40 : -40})`} />
          </g>
        );
      })}
    </svg>
  );
}

export function AiguillagesGame({ seed, level, onFinish }: GameProps) {
  const c = aiguillagesLevel(level);
  const game = useMemo(() => generateAiguillages(createRng(seed), level), [seed, level]);
  const { entry, pos } = layout(c);
  const [switches, setSwitches] = useState<number[]>(game.switches);
  const live = useRef<number[]>(game.switches);
  const runs = useRef<Run[]>(game.trains.map((t) => ({ ...t, at: slow(t.at), spawned: false, done: false, from: entry, node: 0, start: 0 })));
  const [shown, setShown] = useState<{ key: number; color: number; express: boolean; at: Point }[]>([]);
  const [arrived, setArrived] = useState({ ok: 0, bad: 0 });
  const [flash, setFlash] = useState<{ station: number; ok: boolean } | null>(null);
  const count = useRef({ ok: 0, bad: 0 });
  const over = useRef(false);
  /** L'instant de départ de la partie (horloge de `performance.now`). */
  const t0 = useRef(0);

  const finish = useEffectEvent(() => {
    if (over.current) return;
    over.current = true;
    const { ok, bad } = count.current;
    onFinish({
      score: scoreAiguillages(ok, level),
      stats: { ok, bad, trains: c.trains },
      headline: tr(`${ok} trains à bon port sur ${c.trains}`, `${ok} of ${c.trains} trains on target`),
      lines: [
        { label: tr('À la bonne gare', 'Right station'), value: `${ok} / ${c.trains}` },
        { label: tr('À la mauvaise gare', 'Wrong station'), value: bad ? String(bad) : tr('Aucun', 'None') },
        { label: tr('Objectif pour 100 pts', 'Target for 100 pts'), value: String(c.target) },
      ],
    });
  });

  const arrive = useEffectEvent((run: Run, station: number) => {
    const ok = game.stations[station] === run.color;
    count.current = { ok: count.current.ok + (ok ? 1 : 0), bad: count.current.bad + (ok ? 0 : 1) };
    setArrived(count.current);
    setFlash({ station, ok });
    if (ok) fx.good();
    else fx.bad();
  });

  // Les trains avancent image par image ; un train lit l'aiguillage au moment où il l'atteint.
  useEffect(() => {
    t0.current = performance.now();
    const row = slow(c.rowMs);
    let raf = 0;
    const tick = () => {
      const now = performance.now() - t0.current;
      for (const run of runs.current) {
        if (run.done) continue;
        if (!run.spawned) {
          if (now < run.at) continue;
          run.spawned = true;
          run.start = run.at;
        }
        const dur = row * (run.express ? EXPRESS_FACTOR : 1);
        while (!run.done && now - run.start >= dur) {
          run.start += dur;
          if (isStation(c, run.node)) {
            run.done = true;
            arrive(run, stationIndex(c, run.node));
          } else {
            run.from = pos(run.node);
            run.node = childOf(run.node, live.current[run.node]);
          }
        }
      }
      setShown(
        runs.current.flatMap((run, key) => {
          if (!run.spawned || run.done) return [];
          const t = Math.min(1, Math.max(0, (now - run.start) / (row * (run.express ? EXPRESS_FACTOR : 1))));
          const to = pos(run.node);
          return [{ key, color: run.color, express: run.express, at: [run.from[0] + (to[0] - run.from[0]) * t, run.from[1] + (to[1] - run.from[1]) * t] as Point }];
        }),
      );
      if (runs.current.every((r) => r.done) || now >= AIGUILLAGES_MAX_MS) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // Le réseau et les trains sont fixés pour la partie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), 450);
    return () => window.clearTimeout(id);
  }, [flash]);

  const toggle = (node: number) => {
    if (over.current) return;
    fx.tap();
    const next = live.current.map((s, i) => (i === node ? 1 - s : s));
    live.current = next;
    setSwitches(next);
  };

  return (
    <div className="game">
      <GameHud progress={(arrived.ok + arrived.bad) / c.trains} />
      <div className="game__stage aig">
        <p className="anagram__found">
          <strong>{arrived.ok}</strong> / {c.target} · {tr(`${c.trains - arrived.ok - arrived.bad} trains à venir`, `${c.trains - arrived.ok - arrived.bad} trains to come`)}
        </p>
        <Network c={c} stations={game.stations} switches={switches} trains={shown} flash={flash} onSwitch={toggle} />
      </div>
    </div>
  );
}
