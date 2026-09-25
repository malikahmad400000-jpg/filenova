/**
 * FileNova Global Polyfills
 *
 * Polyfill for Promise.withResolvers (ECMAScript 2024 / Node.js 22+).
 * Required by pdfjs-dist and modern PDF parsing runtimes when running in environments
 * that do not yet have Promise.withResolvers built-in.
 */

if (typeof Promise.withResolvers !== "function") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

export {};
