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
const LOAD_TIMEOUT_MS = 45_000;
// Janela de tempo para detectar loops: reloads em sequência mais espaçados
// que este valor são navegação legítima e resetam o contador.
const RELOAD_LOOP_WINDOW_MS = 1500;
// Retries automáticos em caso de onError (rede instável, cold start, etc.)
const MAX_AUTO_RETRIES = 5;
// Backoff: 3s, 5s, 8s, 12s, 18s
const RETRY_DELAYS_MS = [3000, 5000, 8000, 12000, 18000];

export function WebViewBridge() {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | undefined>();
  const [bridgeScript, setBridgeScript] = useState<string | null>(null);
  const [autoReloadCount, setAutoReloadCount] = useState(0);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRetryCountRef = useRef(0);
  const isRetryPendingRef = useRef(false);
  const lastLoadStartRef = useRef<number>(0);
  const lastLoadStartUrlRef = useRef<string>("");
  // Quando PAGE_READY chega ANTES do onLoadStart (Next.js prefetch renderiza
  // o componente antes de a URL mudar no WebView), este flag evita que o
  // onLoadStart seguinte reactive o LoadingScreen desnecessariamente.
  const pageReadyBeforeLoadRef = useRef(false);
  const { saveItem, removeItem, clearItems, loadAllItems } = useWebViewStorage();
  const { loginWithGoogle } = useGoogleAuth();

  // Carrega os dados persistidos antes de montar o WebView
  useEffect(() => {
    loadAllItems().then((data) => {
      setBridgeScript(buildBridgeScript(data));
    });
  }, [loadAllItems]);

  // Limpa os timers ao desmontar para evitar setState em componente morto
  useEffect(() => {
    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

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
        } else if (data.type === "PAGE_READY") {
          // O PWA sinalizou que o conteúdo está pronto. Necessário porque o
          // Android WebView não dispara onLoadEnd em navegações SPA (pushState).
          console.log("[WebView] PAGE_READY — ocultando LoadingScreen");
          if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
          if (!isRetryPendingRef.current) {
            setIsLoading(false);
            autoRetryCountRef.current = 0;
            setAutoReloadCount(0);
          }
          // Marca que PAGE_READY chegou; se o onLoadStart vier depois (race
          // condition do prefetch), ele não deve reativar o LoadingScreen.
          pageReadyBeforeLoadRef.current = true;
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
    autoRetryCountRef.current = 0;
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    webViewRef.current?.reload();
  }, []);

  // Tenta recarregar automaticamente até MAX_AUTO_RETRIES vezes antes de
  // exibir a ErrorScreen. Usa backoff crescente para cobrir cold start do
  // servidor e instabilidade de rede (3s → 5s → 8s → 12s → 18s).
  const scheduleAutoRetry = useCallback((onGiveUp: () => void) => {
    if (autoRetryCountRef.current >= MAX_AUTO_RETRIES) {
      console.warn(`[WebView] máximo de retries (${MAX_AUTO_RETRIES}) atingido — exibindo erro`);
      isRetryPendingRef.current = false;
      onGiveUp();
      return;
    }
    const delay = RETRY_DELAYS_MS[autoRetryCountRef.current] ?? 5000;
    autoRetryCountRef.current += 1;
    isRetryPendingRef.current = true;
    console.log(`[WebView] agendando retry #${autoRetryCountRef.current} em ${delay}ms`);
    retryTimeoutRef.current = setTimeout(() => {
      console.log("[WebView] executando retry — recarregando WebView");
      isRetryPendingRef.current = false;
      webViewRef.current?.reload();
    }, delay);
  }, []);

  const handleLoadStart = useCallback((event: { nativeEvent: { url: string } }) => {
    // Se PAGE_READY chegou antes (Next.js prefetch), o conteúdo já está
    // renderizado — não reactive o LoadingScreen para esta navegação.
    if (pageReadyBeforeLoadRef.current) {
      pageReadyBeforeLoadRef.current = false;
      const url = event.nativeEvent.url;
      const now = Date.now();
      lastLoadStartRef.current = now;
      lastLoadStartUrlRef.current = url;
      console.log(`[WebView] loadStart pós-PAGE_READY — ignorando loading indicator (url=…${url.slice(-30)})`);
      return;
    }
    setIsLoading(true);
    // Inicia timeout: se onLoadEnd não chegar em LOAD_TIMEOUT_MS, exibe erro.
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(() => {
      console.warn("[WebView] timeout de carregamento atingido");
      setIsLoading(false);
      setHasError(true);
    }, LOAD_TIMEOUT_MS);
    // Detecta loops de redirecionamento: conta apenas recargas rápidas da
    // MESMA URL. Navegação para uma URL diferente (ex: '/' → '/jogar')
    // nunca é loop — caso contrário, o clique do usuário dentro de 1,5s
    // após o redirect inicial seria contado erroneamente.
    const url = event.nativeEvent.url;
    const now = Date.now();
    const gap = now - lastLoadStartRef.current;
    const isSameUrl = url === lastLoadStartUrlRef.current;
    const isRapidReload = gap < RELOAD_LOOP_WINDOW_MS && isSameUrl;
    lastLoadStartRef.current = now;
    lastLoadStartUrlRef.current = url;
    console.log(`[WebView] loadStart url=${url.slice(-30)} gap=${gap}ms sameUrl=${isSameUrl} rapid=${isRapidReload} retry#=${autoRetryCountRef.current}`);
    setAutoReloadCount((count) => {
      const next = isRapidReload ? count + 1 : 1;
      if (next >= MAX_AUTO_RELOADS) {
        console.warn(`[WebView] loop detectado (${next} reloads rápidos em ${url}) — exibindo erro`);
        setHasError(true);
      }
      return next;
    });
  }, []);

  const handleLoadEnd = useCallback(() => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    // Mantém o spinner visível se um retry está prestes a acontecer — evita
    // que o usuário veja a tela de erro nativa do Android durante a espera.
    console.log(`[WebView] loadEnd retryPending=${isRetryPendingRef.current} retry#=${autoRetryCountRef.current}`);
    if (!isRetryPendingRef.current) {
      setIsLoading(false);
      // Carga bem-sucedida: reseta contadores para garantir retries completos
      // na próxima falha (sem este reset, falhas subsequentes teriam menos
      // tentativas porque autoRetryCountRef ficaria com valor residual).
      autoRetryCountRef.current = 0;
      // Reseta o detector de loop apenas em carga bem-sucedida. Resetar
      // incondicionalmente (em erro também) impede a acumulação do contador —
      // o loadEnd do erro voltava o count para 0 antes do próximo loadStart
      // rápido, fazendo o detector nunca atingir MAX_AUTO_RELOADS.
      setAutoReloadCount(0);
    }
  }, []);

  // Recupera o WebView quando o processo de conteúdo morre por pressão de
  // memória (WKWebView no iOS) ou é encerrado pelo SO (Android). Sem o
  // setIsLoading(true) imediato, o fundo branco padrão do WebView ficaria
  // exposto até handleLoadStart disparar (podendo demorar centenas de ms).
  const handleProcessTerminated = useCallback(() => {
    console.warn("[WebView] processo de renderização encerrado — recarregando");
    setIsLoading(true);
    webViewRef.current?.reload();
  }, []);

  // Aguarda o script de bridge estar pronto antes de renderizar o WebView
  if (bridgeScript === null) return <LoadingScreen />;
  if (hasError || autoReloadCount >= MAX_AUTO_RELOADS) {
    return <ErrorScreen onRetry={handleRetry} debugInfo={errorInfo} />;
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
        onError={(e) => {
          const desc = e.nativeEvent.description ?? "onError";
          const code = e.nativeEvent.code ?? "";
          console.error("[WebView] onError:", code, desc, e.nativeEvent.url);
          if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
          scheduleAutoRetry(() => {
            setErrorInfo(`${code} ${desc}`.trim());
            setIsLoading(false);
            setHasError(true);
          });
        }}
        onHttpError={(e) => {
          if (e.nativeEvent.statusCode >= 500) {
            const info = `HTTP ${e.nativeEvent.statusCode} ${e.nativeEvent.url}`;
            console.error("[WebView] onHttpError:", info);
            if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
            scheduleAutoRetry(() => {
              setErrorInfo(info);
              setIsLoading(false);
              setHasError(true);
            });
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
  // backgroundColor garante que o WebView não mostre branco durante qualquer
  // gap entre isLoading=false e o primeiro paint da página (processo morto,
  // redirect, etc.). A cor combina com o tema escuro do app e da LoadingScreen.
  webView: { flex: 1, backgroundColor: "#0C1A19" },
});
