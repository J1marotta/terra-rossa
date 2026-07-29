import { useEffect, useRef } from 'react';

import type { PlayerView } from '../multiplayer/types';
import { MovementInput } from '../input/MovementInput';
import { ReloadInput } from '../input/ReloadInput';
import { GameScene } from './GameScene';

interface GameCanvasProps {
  players: readonly PlayerView[];
  sendMovement: (x: number, z: number) => number | null;
  sendDash: () => number | null;
  sendAim: (angleRadians: number) => number | null;
  sendFire: () => number | null;
  sendReloadStart: () => number | null;
  sendReloadAttempt: (clientElapsedMilliseconds: number) => number | null;
  sendMelee: () => number | null;
}

export function GameCanvas({
  players,
  sendMovement,
  sendDash,
  sendAim,
  sendFire,
  sendReloadStart,
  sendReloadAttempt,
  sendMelee,
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
      if (event.button === 0) sendFire();
      else if (event.button === 2) sendMelee();
      else return;
      event.preventDefault();
    };
    const onContextMenu = (event: MouseEvent) => event.preventDefault();
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('contextmenu', onContextMenu);
    return () => {
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('contextmenu', onContextMenu);
    };
  }, [sendAim, sendFire, sendMelee]);

  useEffect(() => {
    const input = new ReloadInput(sendReloadStart, sendReloadAttempt);
    return () => input.dispose();
  }, [sendReloadAttempt, sendReloadStart]);

  useEffect(() => {
    sceneRef.current?.setPlayers(players, performance.now());
  }, [players]);

  const localPlayer = players.find((player) => player.isLocal);
  const worldLabel = `Game world with ${players.length} connected ${players.length === 1 ? 'dog' : 'dogs'}${
    localPlayer === undefined
      ? ''
      : `. Local dog authoritative position ${localPlayer.x.toFixed(2)}, ${localPlayer.z.toFixed(2)}`
  }`;

  const reloading =
    localPlayer !== undefined && localPlayer.reloadCompletionTick > 0;
  const reloadProgress = reloading
    ? Math.min(
        1,
        localPlayer.reloadTicksElapsed / localPlayer.reloadCompletionTick,
      )
    : 0;

  return (
    <div aria-label={worldLabel} className="game-viewport" ref={containerRef}>
      {reloading && (
        <div
          aria-live="polite"
          className={`reload-cue reload-${localPlayer.reloadOutcome}`}
          role="status"
        >
          <span className="reload-track" aria-hidden="true">
            <span style={{ width: `${reloadProgress * 100}%` }} />
          </span>
          <strong>
            {localPlayer.reloadOutcome === 'failed'
              ? 'FUMBLE — HOLD ON'
              : localPlayer.reloadAttempted
                ? localPlayer.reloadOutcome.toUpperCase()
                : 'RELOADING — X TO RISK IT'}
          </strong>
        </div>
      )}
      {!reloading &&
        localPlayer !== undefined &&
        localPlayer.reloadResultTicksRemaining > 0 && (
          <div
            aria-live="polite"
            className={`reload-cue reload-result reload-${localPlayer.reloadOutcome}`}
            role="status"
          >
            <strong>
              {localPlayer.reloadOutcome === 'failed'
                ? 'FUMBLE RECOVERED'
                : `${localPlayer.reloadOutcome.toUpperCase()} RELOAD`}
            </strong>
          </div>
        )}
    </div>
  );
}
