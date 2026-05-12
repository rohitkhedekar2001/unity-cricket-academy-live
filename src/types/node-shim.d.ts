type Buffer = Uint8Array;

declare namespace NodeJS {
  type Timeout = ReturnType<typeof setTimeout>;
  interface ReadableStream {}
}
