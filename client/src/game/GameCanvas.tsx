import { useEffect, useRef } from 'react';

import { GameScene } from './GameScene';

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    const gameScene = new GameScene(container);
    return () => gameScene.dispose();
  }, []);

  return <div className="game-viewport" ref={containerRef} />;
}
