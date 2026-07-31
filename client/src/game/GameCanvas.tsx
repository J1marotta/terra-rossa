import { useEffect, useRef, useState } from 'react';

import type {
  CreatureProjectileView,
  CreatureView,
  PickupView,
  PlayerView,
} from '../multiplayer/types';
import { MovementInput } from '../input/MovementInput';
import { ReloadInput } from '../input/ReloadInput';
import { GameScene } from './GameScene';
import {
  GameAudio,
  readAudioSettings,
  type AudioSettings,
} from '../audio/GameAudio';
import type { NetworkDiagnostics } from '../multiplayer/GameConnection';

interface GameCanvasProps {
  players: readonly PlayerView[];
  creatures: readonly CreatureView[];
  creatureProjectiles: readonly CreatureProjectileView[];
  pickups: readonly PickupView[];
  visibilityRadiusMetres: number;
  darknessStage: number;
  darknessDamagePerSecond: number;
  darknessWarningEvent: number;
  countdownTicksRemaining: number;
  resultEvent: number;
  darknessHalfWidth: number;
  darknessHalfDepth: number;
  connectionWarning: boolean;
  networkDiagnostics: NetworkDiagnostics;
  simulationP50Milliseconds: number;
  simulationP95Milliseconds: number;
  simulationP99Milliseconds: number;
  serverEntityCount: number;
  serverHeapMegabytes: number;
  sendMovement: (x: number, z: number) => number | null;
  sendDash: () => number | null;
  sendAim: (angleRadians: number) => number | null;
  sendFire: () => number | null;
  sendReloadStart: () => number | null;
  sendReloadAttempt: (clientElapsedMilliseconds: number) => number | null;
  sendMelee: () => number | null;
  sendInteract: () => number | null;
}

export function GameCanvas({
  players,
  creatures,
  creatureProjectiles,
  pickups,
  visibilityRadiusMetres,
  darknessStage,
  darknessDamagePerSecond,
  darknessWarningEvent,
  countdownTicksRemaining,
  resultEvent,
  darknessHalfWidth,
  darknessHalfDepth,
  connectionWarning,
  networkDiagnostics,
  simulationP50Milliseconds,
  simulationP95Milliseconds,
  simulationP99Milliseconds,
  serverEntityCount,
  serverHeapMegabytes,
  sendMovement,
  sendDash,
  sendAim,
  sendFire,
  sendReloadStart,
  sendReloadAttempt,
  sendMelee,
  sendInteract,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GameScene | null>(null);
  const audioRef = useRef<GameAudio | null>(null);
  const previousDarknessWarning = useRef(darknessWarningEvent);
  const previousCountdownSecond = useRef(-1);
  const previousResultEvent = useRef(resultEvent);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [audioSettings, setAudioSettings] =
    useState<AudioSettings>(readAudioSettings);
  const [reducedEffects, setReducedEffects] = useState(
    () => localStorage.getItem('terra-rossa.reduced-effects') === 'true',
  );
  const [screenShake, setScreenShake] = useState(
    () => localStorage.getItem('terra-rossa.screen-shake') !== 'false',
  );
  const [resolutionScale, setResolutionScale] = useState(() =>
    Number(localStorage.getItem('terra-rossa.resolution-scale') ?? 0.75),
  );
  const [renderDiagnostics, setRenderDiagnostics] = useState({
    frameP95Milliseconds: 0,
    drawCalls: 0,
    objects: 0,
    geometries: 0,
    textures: 0,
  });
  const debugEnabled = new URLSearchParams(window.location.search).has('debug');

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    const gameScene = new GameScene(container);
    const audio = new GameAudio();
    sceneRef.current = gameScene;
    audioRef.current = audio;
    const onFeedback = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: string }>).detail;
      if (detail?.kind !== undefined) audio.cue(detail.kind);
    };
    const unlock = () => void audio.unlock();
    container.addEventListener('terra-rossa-feedback', onFeedback);
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      sceneRef.current = null;
      gameScene.dispose();
      container.removeEventListener('terra-rossa-feedback', onFeedback);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      audio.dispose();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setPreferences({
      reducedEffects,
      screenShake,
      resolutionScale,
    });
    localStorage.setItem('terra-rossa.reduced-effects', String(reducedEffects));
    localStorage.setItem('terra-rossa.screen-shake', String(screenShake));
    localStorage.setItem(
      'terra-rossa.resolution-scale',
      String(resolutionScale),
    );
  }, [reducedEffects, resolutionScale, screenShake]);

  useEffect(() => {
    audioRef.current?.update(audioSettings);
  }, [audioSettings]);

  useEffect(() => {
    if (!debugEnabled) return;
    const timer = window.setInterval(() => {
      const diagnostics = sceneRef.current?.getDiagnostics();
      if (diagnostics !== undefined) setRenderDiagnostics(diagnostics);
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [debugEnabled]);

  useEffect(() => {
    if (darknessWarningEvent > previousDarknessWarning.current)
      audioRef.current?.cue('darkness-warning');
    previousDarknessWarning.current = darknessWarningEvent;
  }, [darknessWarningEvent]);

  useEffect(() => {
    const second = Math.ceil(countdownTicksRemaining / 30);
    if (
      countdownTicksRemaining > 0 &&
      second !== previousCountdownSecond.current
    )
      audioRef.current?.cue('countdown');
    previousCountdownSecond.current = second;
  }, [countdownTicksRemaining]);

  useEffect(() => {
    if (resultEvent > previousResultEvent.current)
      audioRef.current?.cue('victory');
    previousResultEvent.current = resultEvent;
  }, [resultEvent]);

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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyE' || event.repeat) return;
      sendInteract();
      event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sendInteract]);

  useEffect(() => {
    sceneRef.current?.setPlayers(players, performance.now());
  }, [players]);

  useEffect(() => {
    sceneRef.current?.setCreatures(creatures, performance.now());
  }, [creatures]);

  useEffect(() => {
    sceneRef.current?.setCreatureProjectiles(
      creatureProjectiles,
      performance.now(),
    );
  }, [creatureProjectiles]);

  useEffect(() => {
    sceneRef.current?.setPickups(pickups, performance.now());
  }, [pickups]);

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
  const outsideDarkness =
    localPlayer !== undefined &&
    (Math.abs(localPlayer.x) > darknessHalfWidth ||
      Math.abs(localPlayer.z) > darknessHalfDepth);
  const safetyDirection =
    localPlayer === undefined
      ? ''
      : Math.abs(localPlayer.x) > Math.abs(localPlayer.z)
        ? localPlayer.x > 0
          ? 'W'
          : 'E'
        : localPlayer.z > 0
          ? 'N'
          : 'S';

  return (
    <div aria-label={worldLabel} className="game-viewport" ref={containerRef}>
      <div
        aria-hidden="true"
        className="darkness-vignette"
        style={
          {
            '--visibility-radius': `${visibilityRadiusMetres}`,
          } as React.CSSProperties
        }
      />
      {darknessStage > 0 && (
        <div className="darkness-warning" role="status">
          Darkness closes · outside {darknessDamagePerSecond} damage/sec
        </div>
      )}
      {localPlayer !== undefined &&
        localPlayer.activityCueTicksRemaining > 0 && (
          <div className="activity-cue" role="status">
            {localPlayer.activityCueKind === 'gunfire'
              ? 'Gunfire'
              : 'Creatures'}{' '}
            · {localPlayer.activityCueDirection}
          </div>
        )}
      {localPlayer !== undefined && (
        <div className="field-status" aria-label="Player status">
          <span>
            Health {Math.ceil(localPlayer.health)}/{localPlayer.maximumHealth}
          </span>
          <span>
            Ammo {localPlayer.magazineAmmo}/{localPlayer.reserveAmmo}
          </span>
          {outsideDarkness && <strong>Safety {safetyDirection}</strong>}
          {connectionWarning && <strong>Connection unstable</strong>}
        </div>
      )}
      <button
        aria-expanded={settingsOpen}
        className="settings-toggle"
        onClick={() => setSettingsOpen((open) => !open)}
        type="button"
      >
        Settings
      </button>
      {settingsOpen && (
        <section
          aria-label="Game settings"
          className="settings-panel"
          role="dialog"
        >
          <label>
            <input
              checked={audioSettings.muted}
              onChange={(event) =>
                setAudioSettings({
                  ...audioSettings,
                  muted: event.target.checked,
                })
              }
              type="checkbox"
            />
            Mute effects
          </label>
          <label>
            Master volume
            <input
              max="1"
              min="0"
              onChange={(event) =>
                setAudioSettings({
                  ...audioSettings,
                  masterVolume: Number(event.target.value),
                })
              }
              step="0.1"
              type="range"
              value={audioSettings.masterVolume}
            />
          </label>
          <label>
            Effects volume
            <input
              max="1"
              min="0"
              onChange={(event) =>
                setAudioSettings({
                  ...audioSettings,
                  effectsVolume: Number(event.target.value),
                })
              }
              step="0.1"
              type="range"
              value={audioSettings.effectsVolume}
            />
          </label>
          <label>
            <input
              checked={reducedEffects}
              onChange={(event) => setReducedEffects(event.target.checked)}
              type="checkbox"
            />
            Reduced effects
          </label>
          <label>
            <input
              checked={screenShake}
              onChange={(event) => setScreenShake(event.target.checked)}
              type="checkbox"
            />
            Camera shake
          </label>
          <label>
            Resolution
            <select
              onChange={(event) =>
                setResolutionScale(Number(event.target.value))
              }
              value={resolutionScale}
            >
              <option value="0.5">Low</option>
              <option value="0.75">Balanced</option>
              <option value="1">Full</option>
            </select>
          </label>
        </section>
      )}
      {debugEnabled && (
        <output
          className="performance-panel"
          aria-label="Performance diagnostics"
        >
          <span>
            Frame p95 {renderDiagnostics.frameP95Milliseconds.toFixed(1)} ms
          </span>
          <span>
            Draw {renderDiagnostics.drawCalls} · Objects{' '}
            {renderDiagnostics.objects}
          </span>
          <span>
            GPU {renderDiagnostics.geometries} geo ·{' '}
            {renderDiagnostics.textures} tex
          </span>
          <span>
            Server p50/p95/p99 {simulationP50Milliseconds.toFixed(2)}/
            {simulationP95Milliseconds.toFixed(2)}/
            {simulationP99Milliseconds.toFixed(2)} ms
          </span>
          <span>
            Entities {serverEntityCount} · Heap {serverHeapMegabytes.toFixed(1)}{' '}
            MB
          </span>
          <span>
            Net patch≈{networkDiagnostics.latestPatchBytes} B · down≈
            {networkDiagnostics.downstreamBytes} B · up{' '}
            {networkDiagnostics.upstreamBytes} B
          </span>
        </output>
      )}
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
