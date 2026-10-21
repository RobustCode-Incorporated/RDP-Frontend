/** Home path for a role (ADMIN and DISPATCHER share the dispatch board). */
export function homePathForRole(role: string | undefined) {
  if (role === 'ADMIN' || role === 'DISPATCHER') return '/admin';
  if (role === 'DRIVER') return '/driver';
  return '/restaurant';
}
