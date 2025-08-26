declare module 'node-record-lpcm16' {
  interface StartOptions {
    sampleRate?: number;
    channels?: number;
    threshold?: number;
    verbose?: boolean;
    recordProgram?: 'rec' | 'sox' | 'arecord';
    device?: string | undefined;
  }

  interface RecorderInstance {
    stream(): NodeJS.ReadableStream;
  }

  export function start(options?: StartOptions): RecorderInstance;
  export function stop(): void;

  const _default: { start: typeof start; stop: typeof stop };
  export default _default;
}


