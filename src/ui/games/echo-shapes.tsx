/**
 * Une forme par couleur (Écho, Code secret, Aiguillages), pour reconnaître les couleurs sans les voir :
 * rond, triangle, carré, étoile, losange, goutte, plus, hexagone. Dessinée dans un carré de 24.
 */
export function ShapeGlyph({ color }: { color: number }) {
  switch (color % 8) {
    case 0:
      return <circle cx="12" cy="12" r="7" />;
    case 1:
      return <path d="M12 4.5 20 19H4z" />;
    case 2:
      return <rect x="5" y="5" width="14" height="14" rx="2" />;
    case 3:
      return <path d="m12 3.5 2.5 5.4 5.9.6-4.4 4 1.3 5.8L12 16.4l-5.3 2.9L8 13.5l-4.4-4 5.9-.6z" />;
    case 4:
      return <path d="M12 3.5 20.5 12 12 20.5 3.5 12z" />;
    case 5:
      return <path d="M12 3.5c3.5 4.6 6.5 8.1 6.5 11a6.5 6.5 0 0 1-13 0c0-2.9 3-6.4 6.5-11z" />;
    case 6:
      return <path d="M9.5 4h5v5.5H20v5h-5.5V20h-5v-5.5H4v-5h5.5z" />;
    default:
      return <path d="m12 3.5 7.4 4.25v8.5L12 20.5l-7.4-4.25v-8.5z" />;
  }
}
