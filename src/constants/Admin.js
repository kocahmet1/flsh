export const ADMIN_EMAIL = 'ahmetkoc1@gmail.com';

export function isAdminEmail(email) {
  return String(email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
