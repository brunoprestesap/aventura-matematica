import { describe, expect, it, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDatabase, createUser, createNextRequest } from "./helpers";
import {
  sha256Base64Url,
  getSessionCookieName,
  mintAuthCode,
  consumeAuthCode,
  createSessionForUser,
  NATIVE_SESSION_MAX_AGE_MS,
} from "@/lib/native-auth";
import { POST as exchange } from "@/app/api/native-auth/exchange/route";

describe("lib/native-auth", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("sha256Base64Url é determinístico e em base64url", () => {
    const a = sha256Base64Url("abc");
    expect(a).toBe(sha256Base64Url("abc"));
    expect(a).not.toMatch(/[+/=]/); // base64url não tem +, /, =
  });

  it("getSessionCookieName usa nome não-secure fora de produção", () => {
    expect(getSessionCookieName()).toBe("authjs.session-token");
  });

  it("consumeAuthCode aceita code+verifier válidos uma única vez", async () => {
    const user = await createUser({ email: "a@example.com" });
    const verifier = "verifier-secreto-123";
    const challenge = sha256Base64Url(verifier);
    const code = await mintAuthCode(user.id, challenge);

    const userId = await consumeAuthCode(code, verifier);
    expect(userId).toBe(user.id);

    // segundo uso falha (single-use)
    expect(await consumeAuthCode(code, verifier)).toBeNull();
  });

  it("consumeAuthCode rejeita verifier errado (PKCE)", async () => {
    const user = await createUser({ email: "b@example.com" });
    const code = await mintAuthCode(user.id, sha256Base64Url("certo"));
    expect(await consumeAuthCode(code, "errado")).toBeNull();
  });

  it("consumeAuthCode rejeita código expirado", async () => {
    const user = await createUser({ email: "c@example.com" });
    const verifier = "v";
    const code = await mintAuthCode(user.id, sha256Base64Url(verifier));
    // força expiração
    await prisma.nativeAuthCode.updateMany({
      data: { expires: new Date(Date.now() - 1000) },
    });
    expect(await consumeAuthCode(code, verifier)).toBeNull();
  });

  it("createSessionForUser cria uma Session válida", async () => {
    const user = await createUser({ email: "d@example.com" });
    const { sessionToken, expires } = await createSessionForUser(user.id);
    const row = await prisma.session.findUnique({ where: { sessionToken } });
    expect(row?.userId).toBe(user.id);
    expect(expires.getTime()).toBeGreaterThan(Date.now());
    expect(expires.getTime() - Date.now()).toBeGreaterThan(NATIVE_SESSION_MAX_AGE_MS - 5000);
  });
});

describe("POST /api/native-auth/exchange", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("troca code+verifier válidos por uma sessão e seta o cookie", async () => {
    const user = await createUser({ email: "ex@example.com" });
    const verifier = "verifier-xyz";
    const code = await mintAuthCode(user.id, sha256Base64Url(verifier));

    const req = createNextRequest({
      method: "POST",
      url: "http://localhost:3000/api/native-auth/exchange",
      body: { code, verifier },
    });
    const res = await exchange(req);

    expect(res.status).toBe(200);
    expect(res.cookies.get(getSessionCookieName())?.value).toBeTruthy();

    const sessions = await prisma.session.findMany({ where: { userId: user.id } });
    expect(sessions).toHaveLength(1);
  });

  it("rejeita verifier inválido com 401 e sem criar sessão", async () => {
    const user = await createUser({ email: "ex2@example.com" });
    const code = await mintAuthCode(user.id, sha256Base64Url("certo"));

    const req = createNextRequest({
      method: "POST",
      url: "http://localhost:3000/api/native-auth/exchange",
      body: { code, verifier: "errado" },
    });
    const res = await exchange(req);

    expect(res.status).toBe(401);
    expect(await prisma.session.count()).toBe(0);
  });

  it("rejeita payload sem code/verifier com 400", async () => {
    const req = createNextRequest({
      method: "POST",
      url: "http://localhost:3000/api/native-auth/exchange",
      body: {},
    });
    const res = await exchange(req);
    expect(res.status).toBe(400);
  });
});
