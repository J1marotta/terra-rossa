import { useEffect, useRef } from 'react';

import type { PlayerView } from '../multiplayer/types';
import { MovementInput } from '../input/MovementInput';
import { GameScene } from './GameScene';

interface GameCanvasProps {
  players: readonly PlayerView[];
  sendMovement: (x: number, z: number) => number | null;
}

export function GameCanvas({ players, sendMovement }: GameCanvasProps) {
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
    const input = new MovementInput(sendMovement, (x, z, sequence) =>
      sceneRef.current?.applyPredictedMovement(x, z, sequence),
    );
    return () => input.dispose();
  }, [sendMovement]);

  useEffect(() => {
    sceneRef.current?.setPlayers(players, performance.now());
  }, [players]);

  const localPlayer = players.find((player) => player.isLocal);
  const worldLabel = `Game world with ${players.length} connected ${players.length === 1 ? 'dog' : 'dogs'}${
    localPlayer === undefined
      ? ''
      : `. Local dog authoritative position ${localPlayer.x.toFixed(2)}, ${localPlayer.z.toFixed(2)}`
  }`;

  return (
    <div aria-label={worldLabel} className="game-viewport" ref={containerRef} />
  );
}
