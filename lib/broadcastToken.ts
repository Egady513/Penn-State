/**
 * Merge tokens for broadcast emails. Drop one in a broadcast body and each
 * recipient gets their own copy with it filled in.
 *
 * They live here rather than in the server action because a 'use server'
 * file can only export async functions, and the admin page needs the values.
 */

/** Group number, starting hole, and the other team they're paired with. */
export const PAIRING_TOKEN = '{{group}}'

/** The recipient's own team PIN, so they don't dig for an old email. */
export const PIN_TOKEN = '{{pin}}'
