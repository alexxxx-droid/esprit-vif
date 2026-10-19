/**
 * Transfert d'un appareil à l'autre, sans serveur : la sauvegarde du joueur est compressée,
 * écrite en base 32 (des majuscules et des chiffres, que les QR codes rangent en mode
 * « alphanumérique », plus dense), puis découpée en images qui défilent en boucle. L'autre
 * appareil les ramasse dans n'importe quel ordre. Le même code, en entier, se copie-colle aussi
 * (d'un navigateur à l'appli sur un même téléphone, qui ne peut pas scanner son propre écran).
 */

export const TRANSFER_PREFIX = 'EV1';
/** Caractères de données par image : un QR code d'environ 85 × 85 modules, facile à lire sur un écran. */
export const FRAME_CHARS = 700;

export interface TransferPayload {
  v: 1;
  profile: { name: string; color: number; character: string };
  /** La sauvegarde, au format d'export habituel. */
  backup: string;
}

// ---------- Base 32 (RFC 4648, sans remplissage) ----------

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function toBase32(bytes: Uint8Array): string {
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
    buffer &= (1 << bits) - 1;
  }
  if (bits > 0) out += ALPHABET[(buffer << (5 - bits)) & 31];
  return out;
}

export function fromBase32(text: string): Uint8Array | null {
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of text) {
    const value = ALPHABET.indexOf(ch);
    if (value < 0) return null;
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      out.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
    buffer &= (1 << bits) - 1;
  }
  return Uint8Array.from(out);
}

// ---------- Compression ----------

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const output = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(output).arrayBuffer());
}

/** Le code complet : « EV1: » suivi des données compressées. */
export async function encodeTransfer(payload: TransferPayload): Promise<string> {
  const compressed = await pipe(new TextEncoder().encode(JSON.stringify(payload)), new CompressionStream('deflate-raw'));
  return `${TRANSFER_PREFIX}:${toBase32(compressed)}`;
}

/** Relit un code complet ; null s'il est abîmé ou incomplet. */
export async function decodeTransfer(code: string): Promise<TransferPayload | null> {
  const clean = code.trim().replace(/\s+/g, '').toUpperCase();
  if (!clean.startsWith(`${TRANSFER_PREFIX}:`)) return null;
  const bytes = fromBase32(clean.slice(TRANSFER_PREFIX.length + 1));
  if (!bytes) return null;
  try {
    const text = new TextDecoder().decode(await pipe(bytes, new DecompressionStream('deflate-raw')));
    const raw = JSON.parse(text) as Partial<TransferPayload>;
    if (raw.v !== 1 || typeof raw.backup !== 'string' || typeof raw.profile !== 'object' || raw.profile === null) return null;
    const { name, color, character } = raw.profile;
    return {
      v: 1,
      backup: raw.backup,
      profile: { name: typeof name === 'string' ? name.slice(0, 16) : '', color: Number(color) || 0, character: typeof character === 'string' ? character : 'vif' },
    };
  } catch {
    return null;
  }
}

// ---------- Découpage en images ----------

export interface Frame {
  id: string;
  index: number;
  total: number;
  data: string;
}

/** Les images d'un code : « EV1:ID:3:12:… » (identifiant du transfert, rang, nombre d'images). */
export function splitCode(code: string, id: string, size = FRAME_CHARS): string[] {
  const data = code.slice(TRANSFER_PREFIX.length + 1);
  const total = Math.max(1, Math.ceil(data.length / size));
  return Array.from({ length: total }, (_, i) => `${TRANSFER_PREFIX}:${id}:${i}:${total}:${data.slice(i * size, (i + 1) * size)}`);
}

export function parseFrame(text: string): Frame | null {
  const parts = text.trim().split(':');
  if (parts.length !== 5 || parts[0] !== TRANSFER_PREFIX || !/^[A-Z2-7]{4}$/.test(parts[1])) return null;
  const index = Number(parts[2]);
  const total = Number(parts[3]);
  if (!Number.isInteger(index) || !Number.isInteger(total) || total < 1 || total > 2000 || index < 0 || index >= total) return null;
  if (!/^[A-Z2-7]*$/.test(parts[4])) return null;
  return { id: parts[1], index, total, data: parts[4] };
}

/** Ramasse les images au vol, dans le désordre ; repart de zéro si un autre transfert commence. */
export class FrameCollector {
  private id: string | null = null;
  private parts = new Map<number, string>();
  total = 0;

  /** Vrai si l'image apporte quelque chose de neuf. */
  add(text: string): boolean {
    const frame = parseFrame(text);
    if (!frame) return false;
    if (frame.id !== this.id || frame.total !== this.total) {
      this.id = frame.id;
      this.total = frame.total;
      this.parts = new Map();
    }
    if (this.parts.has(frame.index)) return false;
    this.parts.set(frame.index, frame.data);
    return true;
  }

  get received(): number {
    return this.parts.size;
  }

  get complete(): boolean {
    return this.total > 0 && this.parts.size === this.total;
  }

  /** Le code complet, une fois toutes les images reçues. */
  code(): string | null {
    if (!this.complete) return null;
    return `${TRANSFER_PREFIX}:${Array.from({ length: this.total }, (_, i) => this.parts.get(i)).join('')}`;
  }
}

/** Un identifiant de transfert de quatre caractères. */
export function transferId(random: () => number = Math.random): string {
  return Array.from({ length: 4 }, () => ALPHABET[Math.floor(random() * 32)]).join('');
}
