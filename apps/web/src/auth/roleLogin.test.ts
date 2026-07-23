import {
  getRoleHomePath,
  handleRoleLogin,
  isLoginRole,
  readSelectedLoginRole,
  saveSelectedLoginRole
} from "./roleLogin";

const organizerRole = "organizer";
const participantRole = "participant";
const storage = new Map<string, string>();

const fakeStorage = {
  getItem(key: string): string | null {
    return storage.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    storage.set(key, value);
  },
  removeItem(key: string): void {
    storage.delete(key);
  }
};

if (!isLoginRole(organizerRole) || !isLoginRole(participantRole)) {
  throw new Error("Expected organizer and participant to be valid login roles");
}

if (isLoginRole("judge")) {
  throw new Error("Expected unknown role to be rejected");
}

if (getRoleHomePath(organizerRole) !== "/organizer") {
  throw new Error("Expected organizer login to open organizer dashboard");
}

if (getRoleHomePath(participantRole) !== "/participant") {
  throw new Error("Expected participant login to open participant dashboard");
}

saveSelectedLoginRole(participantRole, fakeStorage);

if (readSelectedLoginRole(fakeStorage) !== participantRole) {
  throw new Error("Expected saved participant role to be readable");
}

storage.clear();
let navigatedTo = "";
let authenticated = false;

await handleRoleLogin(organizerRole, {
  authenticate: async () => {
    authenticated = true;
    return {
      walletAddress: "0x0123456789abcdef0123456789abcdef01234567",
      expiresAt: "2026-08-01T00:00:00.000Z"
    };
  },
  storage: fakeStorage,
  navigate: (path) => {
    navigatedTo = path;
  }
});

if (!authenticated) {
  throw new Error("Expected role login to authenticate wallet before navigation");
}

if (readSelectedLoginRole(fakeStorage) !== organizerRole) {
  throw new Error("Expected selected organizer role to be stored after login");
}

if (navigatedTo !== "/organizer") {
  throw new Error("Expected organizer role login to navigate to organizer dashboard");
}