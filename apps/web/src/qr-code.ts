export type QrErrorCorrection = "M";

export interface QrCodeMatrix {
  readonly version: 5;
  readonly size: 37;
  readonly errorCorrection: QrErrorCorrection;
  readonly mask: 0;
  readonly modules: readonly (readonly boolean[])[];
}

const VERSION = 5 as const;
const SIZE = 37 as const;
const DATA_CODEWORDS = 86;
const BLOCK_DATA_CODEWORDS = 43;
const ECC_CODEWORDS_PER_BLOCK = 24;
const REMAINDER_BITS = 7;
const MAX_BYTE_PAYLOAD = 84;
const MASK = 0 as const;

type WorkingMatrix = Array<Array<boolean | null>>;

function gfMultiply(left: number, right: number): number {
  let x = left;
  let y = right;
  let result = 0;
  for (let i = 0; i < 8; i += 1) {
    if ((y & 1) !== 0) result ^= x;
    y >>>= 1;
    const carry = (x & 0x80) !== 0;
    x = (x << 1) & 0xff;
    if (carry) x ^= 0x1d;
  }
  return result;
}

function gfPow2(exponent: number): number {
  let value = 1;
  for (let i = 0; i < exponent; i += 1) value = gfMultiply(value, 2);
  return value;
}

function polynomialMultiply(left: readonly number[], right: readonly number[]): number[] {
  const result = Array<number>(left.length + right.length - 1).fill(0);
  for (let i = 0; i < left.length; i += 1) {
    for (let j = 0; j < right.length; j += 1) {
      result[i + j] = (result[i + j] ?? 0) ^ gfMultiply(left[i]!, right[j]!);
    }
  }
  return result;
}

function reedSolomonGenerator(degree: number): number[] {
  let generator = [1];
  for (let i = 0; i < degree; i += 1) generator = polynomialMultiply(generator, [1, gfPow2(i)]);
  return generator;
}

function reedSolomonRemainder(data: readonly number[], degree: number): number[] {
  const generator = reedSolomonGenerator(degree);
  let remainder = Array<number>(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ remainder[0]!;
    remainder = [...remainder.slice(1), 0];
    for (let i = 0; i < degree; i += 1) remainder[i] = remainder[i]! ^ gfMultiply(generator[i + 1]!, factor);
  }
  return remainder;
}

function appendBits(bits: boolean[], value: number, length: number): void {
  for (let shift = length - 1; shift >= 0; shift -= 1) bits.push(((value >>> shift) & 1) === 1);
}

function dataCodewords(payload: string): number[] {
  const bytes = [...new TextEncoder().encode(payload)];
  if (bytes.length > MAX_BYTE_PAYLOAD) {
    throw new Error(`QR payload exceeds ${MAX_BYTE_PAYLOAD} UTF-8 bytes supported by the v0.1 label engine.`);
  }

  const bits: boolean[] = [];
  appendBits(bits, 0b0100, 4); // byte mode
  appendBits(bits, bytes.length, 8); // Version 1–9 byte-mode length
  for (const byte of bytes) appendBits(bits, byte, 8);

  const capacityBits = DATA_CODEWORDS * 8;
  const terminator = Math.min(4, capacityBits - bits.length);
  for (let i = 0; i < terminator; i += 1) bits.push(false);
  while (bits.length % 8 !== 0) bits.push(false);

  const codewords: number[] = [];
  for (let offset = 0; offset < bits.length; offset += 8) {
    let value = 0;
    for (let i = 0; i < 8; i += 1) value = (value << 1) | (bits[offset + i] ? 1 : 0);
    codewords.push(value);
  }
  const pads = [0xec, 0x11] as const;
  let padIndex = 0;
  while (codewords.length < DATA_CODEWORDS) {
    codewords.push(pads[padIndex % pads.length]!);
    padIndex += 1;
  }
  return codewords;
}

function finalDataBits(payload: string): boolean[] {
  const codewords = dataCodewords(payload);
  const blocks = [
    codewords.slice(0, BLOCK_DATA_CODEWORDS),
    codewords.slice(BLOCK_DATA_CODEWORDS, DATA_CODEWORDS),
  ];
  const ecc = blocks.map((block) => reedSolomonRemainder(block, ECC_CODEWORDS_PER_BLOCK));
  const interleaved: number[] = [];

  for (let i = 0; i < BLOCK_DATA_CODEWORDS; i += 1) for (const block of blocks) interleaved.push(block[i]!);
  for (let i = 0; i < ECC_CODEWORDS_PER_BLOCK; i += 1) for (const block of ecc) interleaved.push(block[i]!);

  const bits: boolean[] = [];
  for (const byte of interleaved) appendBits(bits, byte, 8);
  for (let i = 0; i < REMAINDER_BITS; i += 1) bits.push(false);
  return bits;
}

function emptyMatrix(): WorkingMatrix {
  return Array.from({ length: SIZE }, () => Array<boolean | null>(SIZE).fill(null));
}

function setupFinder(matrix: WorkingMatrix, row: number, column: number): void {
  for (let dr = -1; dr <= 7; dr += 1) {
    for (let dc = -1; dc <= 7; dc += 1) {
      const r = row + dr;
      const c = column + dc;
      if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) continue;
      const dark = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6 && (
        dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4)
      );
      matrix[r]![c] = dark;
    }
  }
}

function setupAlignment(matrix: WorkingMatrix): void {
  const positions = [6, 30] as const;
  for (const row of positions) {
    for (const column of positions) {
      if (matrix[row]![column] !== null) continue;
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          matrix[row + dr]![column + dc] = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
        }
      }
    }
  }
}

function setupTiming(matrix: WorkingMatrix): void {
  for (let i = 8; i < SIZE - 8; i += 1) {
    if (matrix[i]![6] === null) matrix[i]![6] = i % 2 === 0;
    if (matrix[6]![i] === null) matrix[6]![i] = i % 2 === 0;
  }
}

function bchTypeInfo(data: number): number {
  let value = data << 10;
  const generator = 0x537;
  const bitLength = (input: number) => input === 0 ? 0 : Math.floor(Math.log2(input)) + 1;
  while (bitLength(value) - bitLength(generator) >= 0) value ^= generator << (bitLength(value) - bitLength(generator));
  return ((data << 10) | value) ^ 0x5412;
}

function setupFormatInfo(matrix: WorkingMatrix): void {
  // Error correction M has format bits 00; mask 0 therefore contributes data value 0.
  const bits = bchTypeInfo(MASK);
  for (let i = 0; i < 15; i += 1) {
    const dark = ((bits >>> i) & 1) === 1;
    if (i < 6) matrix[i]![8] = dark;
    else if (i < 8) matrix[i + 1]![8] = dark;
    else matrix[SIZE - 15 + i]![8] = dark;

    if (i < 8) matrix[8]![SIZE - i - 1] = dark;
    else if (i < 9) matrix[8]![15 - i] = dark;
    else matrix[8]![15 - i - 1] = dark;
  }
  matrix[SIZE - 8]![8] = true;
}

function mapData(matrix: WorkingMatrix, bits: readonly boolean[]): void {
  let bitIndex = 0;
  let row = SIZE - 1;
  let direction = -1;
  let column = SIZE - 1;

  while (column > 0) {
    if (column === 6) column -= 1;
    while (true) {
      for (let offset = 0; offset < 2; offset += 1) {
        const currentColumn = column - offset;
        if (matrix[row]![currentColumn] !== null) continue;
        const bit = bits[bitIndex] ?? false;
        const masked = ((row + currentColumn) % 2 === 0) ? !bit : bit;
        matrix[row]![currentColumn] = masked;
        bitIndex += 1;
      }
      row += direction;
      if (row >= 0 && row < SIZE) continue;
      row -= direction;
      direction = -direction;
      break;
    }
    column -= 2;
  }

  if (bitIndex !== bits.length) throw new Error(`QR matrix consumed ${bitIndex} bits; expected ${bits.length}.`);
}

/**
 * QR Model 2, Version 5, error correction M, byte mode and deterministic mask 0.
 * The fixed profile keeps the implementation small/auditable and supports the short
 * locator URL contract of CMDB-009. The QR contains a locator URL, never credentials.
 */
export function encodeQrMatrix(payload: string): QrCodeMatrix {
  const matrix = emptyMatrix();
  setupFinder(matrix, 0, 0);
  setupFinder(matrix, SIZE - 7, 0);
  setupFinder(matrix, 0, SIZE - 7);
  setupAlignment(matrix);
  setupTiming(matrix);
  setupFormatInfo(matrix);
  mapData(matrix, finalDataBits(payload));

  return {
    version: VERSION,
    size: SIZE,
    errorCorrection: "M",
    mask: MASK,
    modules: matrix.map((row) => row.map((module) => module ?? false)),
  };
}
