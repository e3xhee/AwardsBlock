import { authenticateWallet, type WalletSession } from "./walletAuth";

export type LoginRole = "organizer" | "participant";

type RoleStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type RoleLoginDependencies = {
  authenticate?: () => Promise<WalletSession>;
  storage?: RoleStorage | null;
  navigate?: (path: string) => void;
};

const selectedRoleStorageKey = "awardblock:selected-login-role";

export function isLoginRole(value: string): value is LoginRole {
  return value === "organizer" || value === "participant";
}

export function getRoleHomePath(role: LoginRole): string {
  return role === "organizer" ? "/organizer" : "/participant";
}

export function saveSelectedLoginRole(
  role: LoginRole,
  storage: RoleStorage | null = getBrowserStorage()
): void {
  storage?.setItem(selectedRoleStorageKey, role);
}

export function readSelectedLoginRole(
  storage: RoleStorage | null = getBrowserStorage()
): LoginRole | null {
  const value = storage?.getItem(selectedRoleStorageKey) ?? null;
  return value && isLoginRole(value) ? value : null;
}

export function clearSelectedLoginRole(
  storage: RoleStorage | null = getBrowserStorage()
): void {
  storage?.removeItem(selectedRoleStorageKey);
}

export async function handleRoleLogin(
  role: LoginRole,
  dependencies: RoleLoginDependencies = {}
): Promise<WalletSession> {
  const authenticate = dependencies.authenticate ?? authenticateWallet;
  const navigate = dependencies.navigate ?? navigateBrowser;
  const session = await authenticate();

  saveSelectedLoginRole(role, dependencies.storage ?? getBrowserStorage());
  navigate(getRoleHomePath(role));

  return session;
}

function getBrowserStorage(): RoleStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function navigateBrowser(path: string): void {
  globalThis.location.assign(path);
}