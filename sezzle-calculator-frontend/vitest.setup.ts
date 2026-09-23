import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// React needs this to be set for act() outside of RTL's own wrappers
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// React Testing Library drains the microtask queue after every async
// interaction by awaiting a setTimeout(0), and it only advances that timer when
// it detects fake timers -- a check in @testing-library/dom that looks for a
// global `jest`. Under Vitest that check fails, so with fake timers enabled the
// timer is never advanced and every user-event call would hang. Exposing the
// single method RTL calls keeps the handshake working. The check also requires
// setTimeout to carry sinon's `clock` property, so it stays false under real
// timers.
(globalThis as typeof globalThis & { jest?: { advanceTimersByTime: (ms: number) => void } }).jest = {
    advanceTimersByTime: (ms: number) => { vi.advanceTimersByTime(ms); },
};

afterEach(() => {
    cleanup();
});
