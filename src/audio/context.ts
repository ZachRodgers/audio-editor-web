let ctx: AudioContext | null = null;

function createMockAudioContext() {
  const g = () => ({
    gain: {
      value: 1,
      setValueAtTime() {},
      cancelScheduledValues() {},
      linearRampToValueAtTime() {},
    },
    connect() {},
    disconnect() {},
  });
  // @ts-expect-error partial mock for tests
  return {
    currentTime: 0,
    createGain: g,
    createBufferSource() {
      return {
        connect() {
          return this;
        },
        start() {},
        stop() {},
        buffer: null,
      };
    },
    destination: {},
  } as AudioContext;
}

export function ensureAudioContext(test = false) {
  if (!ctx) {
    ctx = test
      ? createMockAudioContext()
      : new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return ctx;
}

export function getAudioContext() {
  if (!ctx) return ensureAudioContext(false);
  return ctx;
}
