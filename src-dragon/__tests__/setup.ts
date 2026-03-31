import '@testing-library/jest-dom/vitest';

// Mock window.matchMedia for jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock scrollTo
Element.prototype.scrollTo = () => {};

// Mock URL.createObjectURL / revokeObjectURL
URL.createObjectURL = () => 'blob:mock';
URL.revokeObjectURL = () => {};
