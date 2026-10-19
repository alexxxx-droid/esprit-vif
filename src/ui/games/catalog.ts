import type { ComponentType } from 'react';
import type { GameId } from '../../core/types';
import type { GameProps } from '../game/chrome';
import { AnagrammesGame } from './AnagrammesGame';
import { BoutiqueGame } from './BoutiqueGame';
import { BalanceGame } from './BalanceGame';
import { CalculGame } from './CalculGame';
import { CorrespondanceGame } from './CorrespondanceGame';
import { DiableGame } from './DiableGame';
import {
  AnagrammesDemo,
  BoutiqueDemo,
  BalanceDemo,
  CalculDemo,
  CorrespondanceDemo,
  DiableDemo,
  FlechesDemo,
  HorlogesDemo,
  IntrusDemo,
  MatriceDemo,
  MonnaieDemo,
  NBackDemo,
  OrdreDemo,
  PluieDemo,
  ReflexeDemo,
  RotationDemo,
  SchulteDemo,
  SudokuDemo,
  StroopDemo,
  TotalDemo,
} from './demos';
import { FlechesGame } from './FlechesGame';
import { HorlogesGame } from './HorlogesGame';
import { IntrusGame } from './IntrusGame';
import { MatriceGame } from './MatriceGame';
import { MonnaieGame } from './MonnaieGame';
import { NBackGame } from './NBackGame';
import { OrdreGame } from './OrdreGame';
import { PluieGame } from './PluieGame';
import { ReflexeGame } from './ReflexeGame';
import { RotationGame } from './RotationGame';
import { SchulteGame } from './SchulteGame';
import { StroopGame } from './StroopGame';
import { SudokuGame } from './SudokuGame';
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
  pluie: PluieGame,
  correspondance: CorrespondanceGame,
  fleches: FlechesGame,
  reflexe: ReflexeGame,
  rotation: RotationGame,
  sudoku: SudokuGame,
  balance: BalanceGame,
  horloges: HorlogesGame,
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
  pluie: PluieDemo,
  correspondance: CorrespondanceDemo,
  fleches: FlechesDemo,
  reflexe: ReflexeDemo,
  rotation: RotationDemo,
  sudoku: SudokuDemo,
  balance: BalanceDemo,
  horloges: HorlogesDemo,
};
