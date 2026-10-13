/** Only same-site paths, so a crafted link cannot send users to another website after login. */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
}
