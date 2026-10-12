/** Half the width a `width` by `height` box covers once turned `rotation` degrees. */
export function halfSpan(width: number, height: number, rotation: number): number {
  const radians = (Math.abs(rotation) * Math.PI) / 180;

  return (width * Math.cos(radians) + height * Math.sin(radians)) / 2;
}
