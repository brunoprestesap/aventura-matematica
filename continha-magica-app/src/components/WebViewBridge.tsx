import { useRef, useState, useEffect, useCallback } from "react";
import { StyleSheet, BackHandler, Platform } from "react-native";
import Constants from "expo-constants";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { useWebViewStorage } from "@/hooks/useWebViewStorage";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ErrorScreen } from "@/components/ErrorScreen";

// URL única definida em app.json (extra.webAppUrl); o fallback evita crash
// caso a config esteja ausente em algum ambiente de build.
const WEB_APP_URL =
  (Constants.expoConfig?.extra?.webAppUrl as string | undefined) ??
  "https://continhamagica.vercel.app";

/*
  Script injetado ANTES do carregamento do conteúdo da página (BeforeContentLoaded).
  Deve terminar com `true;` — obrigatório no iOS, sem exceção.

  O que faz:
  1. Injeta flag global para o PWA detectar o contexto nativo
  2. Pré-popula o localStorage com dados salvos nativamente (resolve o problema
     de limpeza do WKWebView no iOS entre sessões de app)
  3. Intercepta localStorage.setItem e .removeItem para notificar o nativo
     via postMessage e manter os dois lados sincronizados

  Por que BeforeContentLoaded e não injectedJavaScript?
  injectedJavaScript roda APÓS o carregamento — o PWA pode ler o localStorage
  antes do script rodar e encontrar valores vazios no iOS.
  BeforeContentLoaded garante que os dados estão disponíveis no primeiro acesso.
*/
function buildBridgeScript(initialData: Record<string, string>): string {
  return `
(function() {
  // Dentro do shell nativo o service worker do PWA não é necessário
  // e pode causar loops de cache quando cookies/session storage são limpos.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      registrations.forEach(function(reg) { reg.unregister(); });
    });
  }

  window.__NATIVE_APP__ = true;
  window.__PLATFORM__ = '${Platform.OS}';

  // Guarda as funções nativas antes de sobrescrever para pré-popular
  // o localStorage sem disparar mensagens desnecessárias para o nativo.
  const _set = localStorage.setItem.bind(localStorage);
  const _remove = localStorage.removeItem.bind(localStorage);

  const initialData = ${JSON.stringify(initialData)};
  Object.entries(initialData).forEach(([key, value]) => {
    try { _set(key, value); } catch {}
  });

  localStorage.setItem = function(key, value) {
    _set(key, value);
    try {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'STORAGE_SET', key, value })
      );
    } catch {}
  };

  localStorage.removeItem = function(key) {
    _remove(key);
    try {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'STORAGE_REMOVE', key })
      );
    } catch {}
  };

  // Intercepta clear() para que o SecureStore nativo não retenha dados
  // antigos (zombie data) que seriam re-injetados na próxima sessão.
  const _clear = localStorage.clear.bind(localStorage);
  localStorage.clear = function() {
    _clear();
    try {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'STORAGE_CLEAR' })
      );
    } catch {}
  };

  true;
})();
`;
}

const MAX_AUTO_RELOADS = 3;

export function WebViewBridge() {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [bridgeScript, setBridgeScript] = useState<string | null>(null);
  const [autoReloadCount, setAutoReloadCount] = useState(0);
  const { saveItem, removeItem, clearItems, loadAllItems } = useWebViewStorage();
  const { loginWithGoogle } = useGoogleAuth();

  // Carrega os dados persistidos antes de montar o WebView
  useEffect(() => {
    loadAllItems().then((data) => {
      setBridgeScript(buildBridgeScript(data));
    });
  }, [loadAllItems]);

  // Botão back do Android: navega dentro do WebView em vez de fechar o app
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const handler = () => {
      webViewRef.current?.goBack();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", handler);
    return () => sub.remove();
  }, []);

  // Recebe NATIVE_LOGIN do PWA, faz o OAuth no browser do sistema e injeta o
  // código no WebView para troca por sessão (same-origin → cookie gruda aqui).
  const handleNativeLogin = useCallback(async () => {
    const result = await loginWithGoogle();
    if (!result) return;
    const payload = JSON.stringify(result); // { code, verifier }
    webViewRef.current?.injectJavaScript(`
      (function() {
        fetch('/api/native-auth/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: ${JSON.stringify(payload)}
        }).then(function(r) {
          if (r.ok) { window.location.reload(); }
        }).catch(function() {});
      })();
      true;
    `);
  }, [loginWithGoogle]);

  const handleMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === "STORAGE_SET") {
          await saveItem(data.key, data.value);
        } else if (data.type === "STORAGE_REMOVE") {
          await removeItem(data.key);
        } else if (data.type === "STORAGE_CLEAR") {
          await clearItems();
        } else if (data.type === "NATIVE_LOGIN") {
          handleNativeLogin();
        }
      } catch {
        // Ignora mensagens não-JSON vindas do PWA (ex: logs de analytics)
      }
    },
    [saveItem, removeItem, clearItems, handleNativeLogin]
  );

  const handleRetry = useCallback(() => {
    setAutoReloadCount(0);
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  }, []);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    // Conta cada início de carregamento para detectar loops de
    // redirecionamento (loadStart sem loadEnd bem-sucedido). O contador é
    // zerado em handleLoadEnd a cada carregamento completo, então navegação
    // normal nunca atinge o limite.
    setAutoReloadCount((count) => {
      if (count >= MAX_AUTO_RELOADS) {
        setHasError(true);
        return count;
      }
      return count + 1;
    });
  }, []);

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
    // Carregamento concluído com sucesso: reseta o detector de loop.
    setAutoReloadCount(0);
  }, []);

  // Recupera o WebView quando o processo de conteúdo morre por pressão de
  // memória (WKWebView no iOS) ou é encerrado pelo SO (Android). Sem isso o
  // app ficaria com tela branca permanente ou crasharia.
  const handleProcessTerminated = useCallback(() => {
    webViewRef.current?.reload();
  }, []);

  // Aguarda o script de bridge estar pronto antes de renderizar o WebView
  if (bridgeScript === null) return <LoadingScreen />;
  if (hasError || autoReloadCount >= MAX_AUTO_RELOADS) {
    return <ErrorScreen onRetry={handleRetry} />;
  }

  return (
    <>
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_APP_URL }}
        style={styles.webView}
        // JavaScript e armazenamento
        javaScriptEnabled={true}
        domStorageEnabled={true}          // resolve localStorage no Android
        // Bridge — DEVE ser BeforeContentLoaded para pré-popular o localStorage
        injectedJavaScriptBeforeContentLoaded={bridgeScript}
        onMessage={handleMessage}
        // Comportamento de scroll e navegação
        bounces={false}
        scrollEnabled={true}
        allowsBackForwardNavigationGestures={false}
        // Renderização Android
        androidLayerType="hardware"
        // Segurança: bloqueia recursos HTTP em contexto HTTPS
        mixedContentMode="never"
        // User agent — permite que o PWA detecte o contexto nativo
        applicationNameForUserAgent="ContinhaMagica/1.0 (ReactNative; Expo)"
        // Cookie e armazenamento
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        // Eventos de ciclo de vida
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        onHttpError={(e) => {
          if (e.nativeEvent.statusCode >= 500) {
            setIsLoading(false);
            setHasError(true);
          }
        }}
        // Recuperação de morte do processo de renderização
        onContentProcessDidTerminate={handleProcessTerminated}
        onRenderProcessGone={handleProcessTerminated}
      />
      {isLoading && <LoadingScreen />}
    </>
  );
}

const styles = StyleSheet.create({
  webView: { flex: 1 },
});
