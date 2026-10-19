import { createContext, useContext } from 'react';
import type { PlayOutcome } from '../../core/types';

/** Ce que tout composant de jeu reçoit. */
export interface GameProps {
  seed: number;
  level: number;
  onFinish: (outcome: PlayOutcome) => void;
}

/** Habillage commun fourni par le déroulé de partie : titre et bouton pour quitter. */
export interface GameChrome {
  title: string;
  onQuit: () => void;
}

export const GameChromeContext = createContext<GameChrome>({ title: '', onQuit: () => {} });

export function useGameChrome(): GameChrome {
  return useContext(GameChromeContext);
}
