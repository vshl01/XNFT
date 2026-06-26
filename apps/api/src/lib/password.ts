import argon2 from "argon2";

/**
 * Password hashing using argon2id — the OWASP-recommended algorithm for
 * password storage. Parameters use argon2's safe defaults (memory-hard).
 */
const HASH_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
};

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, HASH_OPTIONS);
}

export async function verifyPassword(
  hash: string,
  plain: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    // A malformed hash should read as "does not match", never crash auth.
    return false;
  }
}
