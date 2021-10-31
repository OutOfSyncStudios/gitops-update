import { createHash } from 'crypto';

/**
 * Compute the git blob hash
 * @param blob Contents of the blob
 */
export function computeBlobHash(blob: string): string {
  const contents = Buffer.from(blob);
  const buf = Buffer.concat([Buffer.from(`blob ${contents.length}\0`), contents]);
  const hasher = createHash('sha1');
  return hasher.update(buf).digest('hex');
}
