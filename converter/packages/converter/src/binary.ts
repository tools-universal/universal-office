export type BinaryInput = Uint8Array | ArrayBuffer;

export function toUint8Array(input: BinaryInput): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}
