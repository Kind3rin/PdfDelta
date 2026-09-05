// Annotations use the displayed page, with a bottom-left origin.
// PDF.js includes rotation, crop offsets and UserUnit in its viewport matrix.
export function annotationGeometry(viewport) {
  const [a,b,c,d,e,f] = viewport.transform;
  const determinant = a*d-b*c;
  const scale = Math.hypot(a,b);
  if (!Number.isFinite(determinant) || !determinant || !scale) throw new Error('Geometria pagina non valida.');
  return {
    scale,
    angle: Math.atan2(-b/determinant, d/determinant)*180/Math.PI,
    point({ x, y }) {
      const screenY = viewport.height-y;
      return { x: (d*(x-e)-c*(screenY-f))/determinant, y: (-b*(x-e)+a*(screenY-f))/determinant };
    },
  };
}
