import keycloak from '../keycloak';

export function useAuth() {
  const profile = keycloak.tokenParsed as Record<string, unknown> | undefined;
  const roles: string[] = (keycloak.realmAccess?.roles ?? []);

  return {
    isAdmin: roles.includes('admin'),
    isManager: roles.includes('manager'),
    isPlayer: roles.includes('player'),
    username: profile?.['preferred_username'] as string ?? '',
    email: profile?.['email'] as string ?? '',
    firstName: profile?.['given_name'] as string ?? '',
    lastName: profile?.['family_name'] as string ?? '',
    logout: () => keycloak.logout(),
    token: keycloak.token,
  };
}
