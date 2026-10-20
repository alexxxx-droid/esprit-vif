import { Fragment, type ReactNode } from 'react';

/**
 * Une phrase traduite dont certains morceaux sont des éléments : le texte entier passe par `tr()`
 * (chaque langue place les morceaux où sa grammaire le veut), puis `{nom}` est remplacé par l'élément.
 *   rich(tr('Niveau {level} débloqué\u00a0!', 'Level {level} unlocked!'), { level: <strong>{n}</strong> })
 */
export function rich(text: string, parts: Record<string, ReactNode>): ReactNode {
  return text.split(/(\{\w+\})/).map((piece, i) => {
    const name = /^\{(\w+)\}$/.exec(piece)?.[1];
    return <Fragment key={i}>{name !== undefined && name in parts ? parts[name] : piece}</Fragment>;
  });
}
