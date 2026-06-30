/** Resolves a value or `{ build(): T }` builder into `T`. */
export type Buildable<T> = T | { build(): T };

export function resolveBuildable<T>(input: Buildable<T>): T {
  if (input !== null && typeof input === "object" && "build" in input && typeof input.build === "function") {
    return input.build();
  }
  return input as T;
}

export function hasBuild<T>(input: unknown): input is { build(): T } {
  return input !== null && typeof input === "object" && "build" in input && typeof (input as { build: unknown }).build === "function";
}
