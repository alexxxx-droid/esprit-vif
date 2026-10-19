import type { ComponentType } from 'react';
import type { GameId } from '../../core/types';
import type { GameProps } from '../game/chrome';
import { CalculGame } from './CalculGame';
import { CalculDemo, SchulteDemo, StroopDemo } from './demos';
import { SchulteGame } from './SchulteGame';
import { StroopGame } from './StroopGame';

export const GAME_COMPONENTS: Record<GameId, ComponentType<GameProps>> = {
  calcul: CalculGame,
  stroop: StroopGame,
  schulte: SchulteGame,
};

/** Mini-démonstrations animées de l'écran d'intro. */
export const GAME_DEMOS: Record<GameId, ComponentType<{ level: number }>> = {
  calcul: CalculDemo,
  stroop: StroopDemo,
  schulte: SchulteDemo,
};
