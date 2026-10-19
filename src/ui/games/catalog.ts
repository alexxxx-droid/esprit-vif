import type { ComponentType } from 'react';
import type { GameId } from '../../core/types';
import type { GameProps } from '../game/chrome';
import { AnagrammesGame } from './AnagrammesGame';
import { BoutiqueGame } from './BoutiqueGame';
import { CalculGame } from './CalculGame';
import { DiableGame } from './DiableGame';
import {
  AnagrammesDemo,
  BoutiqueDemo,
  CalculDemo,
  DiableDemo,
  IntrusDemo,
  MatriceDemo,
  MonnaieDemo,
  NBackDemo,
  OrdreDemo,
  SchulteDemo,
  StroopDemo,
  TotalDemo,
} from './demos';
import { IntrusGame } from './IntrusGame';
import { MatriceGame } from './MatriceGame';
import { MonnaieGame } from './MonnaieGame';
import { NBackGame } from './NBackGame';
import { OrdreGame } from './OrdreGame';
import { SchulteGame } from './SchulteGame';
import { StroopGame } from './StroopGame';
import { TotalGame } from './TotalGame';

export const GAME_COMPONENTS: Record<GameId, ComponentType<GameProps>> = {
  calcul: CalculGame,
  stroop: StroopGame,
  schulte: SchulteGame,
  matrice: MatriceGame,
  nback: NBackGame,
  total: TotalGame,
  intrus: IntrusGame,
  anagrammes: AnagrammesGame,
  boutique: BoutiqueGame,
  diable: DiableGame,
  ordre: OrdreGame,
  monnaie: MonnaieGame,
};

/** Mini-démonstrations animées de l'écran d'intro. */
export const GAME_DEMOS: Record<GameId, ComponentType<{ level: number }>> = {
  calcul: CalculDemo,
  stroop: StroopDemo,
  schulte: SchulteDemo,
  matrice: MatriceDemo,
  nback: NBackDemo,
  total: TotalDemo,
  intrus: IntrusDemo,
  anagrammes: AnagrammesDemo,
  boutique: BoutiqueDemo,
  diable: DiableDemo,
  ordre: OrdreDemo,
  monnaie: MonnaieDemo,
};
