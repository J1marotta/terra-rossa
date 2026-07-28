import type { WebGLRenderer } from 'three';

type RendererStatus = 'waiting';

const rendererStatus: RendererStatus = 'waiting';

export function App() {
  const rendererTypeCheck: WebGLRenderer | undefined = undefined;
  void rendererTypeCheck;

  return (
    <main className="shell">
      <p className="eyebrow">Terra Rossa</p>
      <h1>The night is gathering.</h1>
      <p>Four-player web prototype workspace is ready.</p>
      <p className="status">Renderer: {rendererStatus}</p>
    </main>
  );
}
