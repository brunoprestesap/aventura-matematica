import { useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import Constants from "expo-constants";

const WEB_APP_URL =
  (Constants.expoConfig?.extra?.webAppUrl as string | undefined) ??
  "https://continhamagica.com.br";

// Necessário para finalizar sessões de auth pendentes no Android.
WebBrowser.maybeCompleteAuthSession();

/** Converte bytes em base64url (sem +, /, =). */
function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function useGoogleAuth() {
  /**
   * Abre o OAuth do Google no browser do sistema e retorna o código de
   * handoff + o verifier PKCE. Retorna null se o usuário cancelar/falhar.
   */
  const loginWithGoogle = useCallback(async (): Promise<
    { code: string; verifier: string } | null
  > => {
    // 1. Gera o code_verifier e o code_challenge = base64url(sha256(verifier)).
    const verifier = toBase64Url(Crypto.getRandomBytes(32));
    const challenge = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      verifier,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    ).then((b64) => b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""));

    // 2. Deep link de retorno. createURL respeita o scheme do app.json.
    const redirectUri = Linking.createURL("auth-callback");

    const startUrl =
      `${WEB_APP_URL}/api/native-auth/start` +
      `?challenge=${encodeURIComponent(challenge)}` +
      `&redirect=${encodeURIComponent(redirectUri)}`;

    // 3. Abre no browser do sistema e aguarda o redirect de volta ao app.
    const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectUri);
    if (result.type !== "success" || !result.url) return null;

    // 4. Extrai o código do deep link.
    const { queryParams } = Linking.parse(result.url);
    const code = queryParams?.code;
    if (typeof code !== "string") return null;

    return { code, verifier };
  }, []);

  return { loginWithGoogle };
}
