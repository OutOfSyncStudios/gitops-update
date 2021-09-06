/**
 * Unescapes a reference token according to RFC 6901
 * @param token The reference token
 * @returns The token with escape sequences substituted
 */
export function unescapeToken(token: string): string {
  return token.replace('~1', '/').replace('~0', '~');
}

/**
 * Parses a JSON pointer into a list of reference tokens
 * @param pointer A string containing a RFC 6901 compliant JSON Pointer
 * @returns A list of unescaped reference tokens
 */
export function parse(pointer: string): string[] {
  if (!pointer.startsWith('/')) {
    throw new Error(`Invalid JSON pointer: "${pointer}"`);
  }
  return pointer.substring(1).split('/').map(unescapeToken);
}
