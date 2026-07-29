import { useEffect, useRef } from 'react';

import type { PlayerView } from '../multiplayer/types';
import { GameScene } from './GameScene';

interface GameCanvasProps {
  players: readonly PlayerView[];
}

export function GameCanvas({ players }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GameScene | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    const gameScene = new GameScene(container);
    sceneRef.current = gameScene;
    return () => {
      sceneRef.current = null;
      gameScene.dispose();
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setPlayers(players);
  }, [players]);

  return (
    <div
      aria-label={`Game world with ${players.length} connected ${players.length === 1 ? 'dog' : 'dogs'}`}
      className="game-viewport"
      ref={containerRef}
    />
  );
}
