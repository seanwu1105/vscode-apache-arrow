export function Ok<V>(v: V) {
  return { isError: false, value: v, unwrap: () => v } as const;
}

export function Err<E extends Error>(e: E) {
  return {
    isError: true,
    error: e,
    unwrap: () => {
      throw e;
    },
  } as const;
}

export type Result<V, E extends Error> = ReturnType<
  typeof Ok<V> | typeof Err<E>
>;
