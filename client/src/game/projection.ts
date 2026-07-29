export interface OrthographicBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function calculateOrthographicBounds(
  width: number,
  height: number,
  viewHeight = 18,
): OrthographicBounds {
  if (width <= 0 || height <= 0 || viewHeight <= 0) {
    throw new Error('Viewport dimensions and view height must be positive.');
  }

  const halfHeight = viewHeight / 2;
  const halfWidth = halfHeight * (width / height);
  return {
    left: -halfWidth,
    right: halfWidth,
    top: halfHeight,
    bottom: -halfHeight,
  };
}
