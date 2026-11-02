// Newman ships without types; only the part this project uses is declared.
declare module 'newman' {
  interface RunOptions {
    collection: string;
    environment?: string;
    envVar?: { key: string; value: string }[];
    reporters?: string[];
    reporter?: Record<string, unknown>;
    timeoutRequest?: number;
  }
  interface Summary {
    run: { failures: unknown[] };
  }
  const newman: { run(options: RunOptions, callback: (error: Error | null, summary: Summary) => void): void };
  export default newman;
}
