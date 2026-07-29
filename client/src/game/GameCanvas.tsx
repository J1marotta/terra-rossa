import { useEffect, useRef } from 'react';

import type { PlayerView } from '../multiplayer/types';
import { MovementInput } from '../input/MovementInput';
import { GameScene } from './GameScene';

interface GameCanvasProps {
  players: readonly PlayerView[];
  sendMovement: (x: number, z: number) => number | null;
  sendDash: () => number | null;
  sendAim: (angleRadians: number) => number | null;
  sendFire: () => number | null;
}

export function GameCanvas({
  players,
  sendMovement,
  sendDash,
  sendAim,
  sendFire,
}: GameCanvasProps) {
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
    const input = new MovementInput(
      sendMovement,
      (x, z, sequence) =>
        sceneRef.current?.applyPredictedMovement(x, z, sequence),
      sendDash,
      (sequence) => sceneRef.current?.applyPredictedDash(sequence),
    );
    return () => input.dispose();
  }, [sendDash, sendMovement]);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    let lastAimSentAt = 0;
    const onPointerMove = (event: PointerEvent) => {
      const angle = sceneRef.current?.aimAngleFromClientPoint(
        event.clientX,
        event.clientY,
      );
      if (angle === undefined || performance.now() - lastAimSentAt < 50) return;
      lastAimSentAt = performance.now();
      sendAim(angle);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      sendFire();
      event.preventDefault();
    };
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerdown', onPointerDown);
    return () => {
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerdown', onPointerDown);
    };
  }, [sendAim, sendFire]);

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
