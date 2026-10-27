export interface StartGate {
  begin(): number;
  cancel(): void;
  isCurrent(token: number): boolean;
}

/** Guards an async start against a stop (or newer start) that happens while it awaits. */
export function createStartGate(): StartGate {
  let latest = 0;
  return {
    begin: () => ++latest,
    cancel: () => {
      latest++;
    },
    isCurrent: (token) => token === latest,
  };
}
