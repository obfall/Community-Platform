export const TEST_USERS = {
  admin: { email: "e2e-admin@test.com", password: "qaz1234", name: "E2E Admin" },
  owner: { email: "e2e-owner@test.com", password: "qaz1234", name: "E2E Owner" },
  member: { email: "e2e-member@test.com", password: "qaz1234", name: "E2E Member" },
} as const;

export type TestUserKey = keyof typeof TEST_USERS;
