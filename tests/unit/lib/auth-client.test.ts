import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { signIn } from "next-auth/react";
import { signInWithGoogle } from "@/lib/auth-client";

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

describe("signInWithGoogle", () => {
  beforeEach(() => {
    vi.mocked(signIn).mockClear();
  });

  afterEach(() => {
    delete (window as { __NATIVE_APP__?: boolean }).__NATIVE_APP__;
    delete (window as { ReactNativeWebView?: unknown }).ReactNativeWebView;
  });

  it("usa o fluxo NextAuth padrão na web", () => {
    signInWithGoogle();
    expect(vi.mocked(signIn)).toHaveBeenCalledWith("google");
  });

  it("delega ao shell nativo quando dentro do app (WebView)", () => {
    const postMessage = vi.fn();
    (window as { __NATIVE_APP__?: boolean }).__NATIVE_APP__ = true;
    (window as { ReactNativeWebView?: unknown }).ReactNativeWebView = {
      postMessage,
    };

    signInWithGoogle();

    expect(postMessage).toHaveBeenCalledWith(
      JSON.stringify({ type: "NATIVE_LOGIN" })
    );
    expect(vi.mocked(signIn)).not.toHaveBeenCalled();
  });
});
