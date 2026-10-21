import type { ComponentType } from 'react';
import type { GameId } from '../../core/types';
import type { GameProps, TutorialProps } from '../game/chrome';
import { AnagrammesGame } from './AnagrammesGame';
import { BoutiqueGame } from './BoutiqueGame';
import { BalanceGame } from './BalanceGame';
import { CalculGame } from './CalculGame';
import { CategoriesGame } from './CategoriesGame';
import { CorrespondanceGame } from './CorrespondanceGame';
import { CoupGame } from './CoupGame';
import { ContrairesGame } from './ContrairesGame';
import { ContrairesDemo } from './contraires-demo';
import { FilatureGame } from './FilatureGame';
import { FilatureDemo } from './filature-demo';
import { LuciolesGame } from './LuciolesGame';
import { LuciolesDemo } from './lucioles-demo';
import { DiableGame } from './DiableGame';
import {
  AnagrammesDemo,
  BoutiqueDemo,
  BalanceDemo,
  CalculDemo,
  CategoriesDemo,
  CorrespondanceDemo,
  CoupDemo,
  DiableDemo,
  FlechesDemo,
  HorlogesDemo,
  LectureDemo,
  LettreDemo,
  IntrusDemo,
  ItiDemo,
  MatriceDemo,
  MonnaieDemo,
  MotsDemo,
  NBackDemo,
  OrdreDemo,
  PairesDemo,
  PluieDemo,
  QuiDemo,
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
import { ItiGame } from './ItiGame';
import { ManqueGame } from './ManqueGame';
import { ManqueDemo } from './manque-demo';
import { GrandGame } from './GrandGame';
import { GrandDemo } from './grand-demo';
import { RegleGame } from './RegleGame';
import { RegleDemo } from './regle-demo';
import { SymbolesGame } from './SymbolesGame';
import { SymbolesDemo } from './symboles-demo';
import { AiguillagesGame } from './AiguillagesGame';
import { AiguillagesDemo } from './aiguillages-demo';
import { MelesGame } from './MelesGame';
import { MelesDemo } from './meles-demo';
import { CombienGame } from './CombienGame';
import { CombienDemo } from './combien-demo';
import { CodeGame } from './CodeGame';
import { CodeDemo } from './code-demo';
import { MiroirGame } from './MiroirGame';
import { MiroirDemo } from './miroir-demo';
import { EchoGame } from './EchoGame';
import { EchoDemo } from './echo-demo';
import { CompteGame } from './CompteGame';
import { CompteDemo } from './compte-demo';
import { SuitesGame } from './SuitesGame';
import { SuitesDemo } from './suites-demo';
import { LectureGame } from './LectureGame';
import { LettreGame } from './LettreGame';
import { MatriceGame } from './MatriceGame';
import { MonnaieGame } from './MonnaieGame';
import { MotsGame } from './MotsGame';
import { NBackGame } from './NBackGame';
import { NBackTutorial } from './NBackTutorial';
import { OrdreGame } from './OrdreGame';
import { PairesGame } from './PairesGame';
import { PluieGame } from './PluieGame';
import { QuiGame } from './QuiGame';
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
  mots: MotsGame,
  lettre: LettreGame,
  categories: CategoriesGame,
  paires: PairesGame,
  coupdoeil: CoupGame,
  filature: FilatureGame,
  lucioles: LuciolesGame,
  contraires: ContrairesGame,
  quiestqui: QuiGame,
  lecture: LectureGame,
  itineraire: ItiGame,
  manque: ManqueGame,
  grand: GrandGame,
  regle: RegleGame,
  symboles: SymbolesGame,
  aiguillages: AiguillagesGame,
  motsmeles: MelesGame,
  combien: CombienGame,
  code: CodeGame,
  miroir: MiroirGame,
  echo: EchoGame,
  compte: CompteGame,
  suites: SuitesGame,
};

/** Essais guidés, sans chrono, pour les jeux les moins évidents à saisir. */
export const GAME_TUTORIALS: Partial<Record<GameId, ComponentType<TutorialProps>>> = {
  nback: NBackTutorial,
};

/** Jeux où l'on répond avec le pavé numérique : on peut aussi y écrire au doigt. */
export const NUMBER_GAMES: ReadonlySet<GameId> = new Set(['calcul', 'total', 'diable', 'monnaie', 'pluie', 'boutique', 'combien', 'suites']);

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
  mots: MotsDemo,
  lettre: LettreDemo,
  categories: CategoriesDemo,
  paires: PairesDemo,
  coupdoeil: CoupDemo,
  filature: FilatureDemo,
  lucioles: LuciolesDemo,
  contraires: ContrairesDemo,
  quiestqui: QuiDemo,
  lecture: LectureDemo,
  itineraire: ItiDemo,
  manque: ManqueDemo,
  grand: GrandDemo,
  regle: RegleDemo,
  symboles: SymbolesDemo,
  aiguillages: AiguillagesDemo,
  motsmeles: MelesDemo,
  combien: CombienDemo,
  code: CodeDemo,
  miroir: MiroirDemo,
  echo: EchoDemo,
  compte: CompteDemo,
  suites: SuitesDemo,
};
