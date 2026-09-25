// Only these three explicitly provisioned test accounts accept short usernames.
// Roles are still read from Supabase; choosing a username never grants access.
const TEST_ACCOUNTS: Record<string, string> = {
  director: 'director@pruebas.virla.invalid',
  personal: 'personal@pruebas.virla.invalid',
  admin: 'admin@pruebas.virla.invalid',
};
export function loginEmail(identity: string) {
  const normalized = identity.trim().toLowerCase();
  return Object.hasOwn(TEST_ACCOUNTS, normalized) ? TEST_ACCOUNTS[normalized] : normalized;
}
