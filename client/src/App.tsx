import { GameCanvas } from './game/GameCanvas';

export function App() {
  return (
    <main className="app-shell">
      <GameCanvas />
      <section className="title-panel">
        <p className="eyebrow">Terra Rossa</p>
        <h1>The night is gathering.</h1>
        <p>Four dogs will enter. Only one leaves the dark.</p>
        <button type="button" disabled>
          The hunt begins soon
        </button>
      </section>
    </main>
  );
}
