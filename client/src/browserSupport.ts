export interface BrowserSupport {
  readonly supported: boolean;
  readonly message: string;
}

export function evaluateBrowserSupport(userAgent: string): BrowserSupport {
  const chrome = /\b(?:Chrome|CriOS)\/\d+/.test(userAgent);
  const excluded = /\b(?:Edg|OPR|Firefox|FxiOS)\//.test(userAgent);
  if (chrome && !excluded) return { supported: true, message: '' };
  return {
    supported: false,
    message:
      'Terra Rossa currently supports desktop Google Chrome only. Open this page in current Chrome with WebGL and hardware acceleration enabled.',
  };
}
