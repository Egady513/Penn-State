/**
 * Merge token for broadcast emails. Drop it in a broadcast body and each
 * golfer receives their own group: group number, starting hole, and the
 * other team they're paired with.
 *
 * Lives here rather than in the server action because a 'use server' file
 * can only export async functions, and the admin page needs the same value.
 */
export const PAIRING_TOKEN = '{{group}}'
