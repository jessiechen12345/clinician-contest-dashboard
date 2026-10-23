import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { adminConfigured, adminEmails, adminPasswordMatches, createAdminToken, isApprovedAdmin, verifyAdminToken } from "../src/lib/adminSession";

beforeEach(() => {
  process.env.GATE_SECRET = "test-secret-123";
  process.env.ADMIN_PASSWORD = "admin-pass-xyz";
  process.env.ADMIN_EMAILS = "Jessie.Chen@telus.com, second.admin@telus.com";
});
afterEach(() => { delete process.env.ADMIN_PASSWORD; delete process.env.ADMIN_EMAILS; delete process.env.GATE_SECRET; });

describe("approved emails", () => {
  it("come from ADMIN_EMAILS, case-insensitively, and ignore the placeholder addresses in the code file", () => {
    expect(adminEmails()).toEqual(["jessie.chen@telus.com", "second.admin@telus.com"]);
    expect(isApprovedAdmin("JESSIE.CHEN@telus.com")).toBe(true);
    expect(isApprovedAdmin("admin.one@example.com")).toBe(false);
    expect(isApprovedAdmin("someone.else@telus.com")).toBe(false);
  });
  it("sign-in is only 'configured' when the password and at least one email are set", () => {
    expect(adminConfigured()).toBe(true);
    delete process.env.ADMIN_PASSWORD;
    expect(adminConfigured()).toBe(false);
  });
});

describe("password and session", () => {
  it("accepts only the right password", async () => {
    expect(await adminPasswordMatches("admin-pass-xyz")).toBe(true);
    expect(await adminPasswordMatches("admin-pass-xy")).toBe(false);
    expect(await adminPasswordMatches("")).toBe(false);
  });
  it("round-trips a session and returns the email", async () => {
    const t = await createAdminToken("Jessie.Chen@telus.com");
    expect(await verifyAdminToken(t)).toBe("jessie.chen@telus.com");
  });
  it("rejects tampered, expired, missing and no-longer-approved sessions", async () => {
    const t = await createAdminToken("jessie.chen@telus.com");
    const [exp, e, sig] = t.split(".");
    expect(await verifyAdminToken(`${exp}.${Buffer.from("other@telus.com").toString("base64url")}.${sig}`)).toBeNull();
    expect(await verifyAdminToken(`${Number(exp) + 99999}.${e}.${sig}`)).toBeNull();
    expect(await verifyAdminToken(`1000.${e}.${sig}`)).toBeNull();
    expect(await verifyAdminToken(undefined)).toBeNull();
    process.env.ADMIN_EMAILS = "second.admin@telus.com"; // removed from the list => revoked
    expect(await verifyAdminToken(t)).toBeNull();
  });
});
