import '@testing-library/jest-dom/vitest';

// Polyfill window.scrollTo in jsdom test environment
Object.defineProperty(window, 'scrollTo', {
  value: () => {},
  writable: true,
});

// Polyfill ResizeObserver for Recharts ResponsiveContainer in jsdom
class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window.ResizeObserver === 'undefined') {
  window.ResizeObserver = ResizeObserverPolyfill as unknown as typeof ResizeObserver;
}
