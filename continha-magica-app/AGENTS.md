# AGENTS.md — Continha Mágica App

Arquivo de referência para agentes de IA que trabalharem no app híbrido (Expo + WebView).

## Visão geral

Este diretório (`continha-magica-app/`) contém o **shell nativo** do app Continha Mágica. Ele não reescreve a lógica do PWA: apenas carrega a web app publicada em `https://continhamagica.vercel.app` dentro de um `WebView`, com integrações nativas mínimas para:

- Persistência de dados entre sessões (SecureStore ↔ localStorage).
- Detecção de conectividade.
- Controle de safe area, splash screen e status bar.
- Navegação pelo botão físico de voltar no Android.

## Stack

| Tecnologia | Versão |
|---|---|
| Expo SDK | 55 |
| React Native | 0.83.6 |
| React | 19.2.7 |
| Expo Router | v7 (pasta `src/app/`) |
| react-native-webview | 13.16.0 |

## Estrutura de pastas

```
assets/
  icon.png             # Ícone do app (1024×1024), gerado a partir de ../assets/icon-source.svg
  adaptive-icon.png    # Foreground do ícone adaptativo Android (1024×1024), gerado a partir de ../assets/icon-source-adaptive.svg
  splash.png           # Splash screen (1284×2778), gerada a partir de ../assets/splash-source.svg
src/
  app/
    _layout.tsx          # SafeAreaProvider + StatusBar + Stack
    index.tsx            # Tela principal com WebViewBridge e OfflineBanner
  components/
    WebViewBridge.tsx    # WebView + bridge de localStorage
    LoadingScreen.tsx    # Tela de carregamento
    ErrorScreen.tsx      # Tela de erro com retry
    OfflineBanner.tsx    # Banner quando offline
  hooks/
    useNetworkStatus.ts  # NetInfo wrapper
    useWebViewStorage.ts # SecureStore wrapper para bridge
```

## Regras importantes

1. **Não modifique o PWA a partir deste diretório.** O projeto Next.js fica na raiz (`../`).
2. **Não use `SafeAreaView` do `react-native`.** Use `useSafeAreaInsets` de `react-native-safe-area-context`.
3. **Não teste no Expo Go.** `react-native-webview` exige Development Build.
4. **Não adicione `newArchEnabled` ao `app.json`.** A Legacy Architecture foi removida no React Native 0.82.
5. **Instale dependências com `npx expo install <pacote>`**, nunca `npm install` direto.
6. **Comentários em português brasileiro.**

## Persistência

As chaves sincronizadas entre SecureStore e localStorage do PWA são:

- `continha-magica-grade`
- `continha-magica-history`
- `continha-magica-user-name`
- `continha-magica-mastery-v1`

Essa sincronia é necessária principalmente no iOS, onde o WKWebView pode limpar o localStorage entre sessões de app.

## Login Google (handoff PKCE)

O Google bloqueia OAuth dentro de WebView. O fluxo de login:

1. `useGoogleAuth().loginWithGoogle()` gera um `code_verifier`/`code_challenge` (PKCE) e abre `/api/native-auth/start` no **browser do sistema** via `expo-web-browser`.
2. Após o OAuth, o backend emite um código de uso único e redireciona ao deep link `continhamagica://auth-callback?code=...`.
3. O `WebViewBridge` recebe `NATIVE_LOGIN` do PWA, executa o passo 1-2 e injeta uma chamada a `/api/native-auth/exchange` (same-origin) que estabelece a sessão no WebView; em seguida recarrega.

O `code_verifier` nunca sai do app (PKCE). Deps: `expo-web-browser`, `expo-crypto`, `expo-linking`.

## Scripts úteis

```bash
# Verificar saúde do projeto
npm run doctor

# Iniciar metro (após instalar o development build)
npm start

# Builds
npm run build:dev:android
npm run build:dev:ios
npm run build:preview:android
npm run build:preview:ios
npm run build:prod:android
npm run build:prod:ios
```

## Notas sobre configurações

- `edgeToEdgeEnabled` não está declarado em `app.json` porque o schema do Expo SDK 55 não aceita essa propriedade explicitamente; o edge-to-edge é habilitado por padrão em novos projetos do SDK 55. O padding de insets é controlado manualmente via `useSafeAreaInsets`.
- O `projectId` do EAS em `app.json` já está configurado (`extra.eas.projectId`). Não é mais um placeholder.
- A URL do PWA carregado pelo WebView vem de `extra.webAppUrl` no `app.json`, lida via `expo-constants` em `WebViewBridge.tsx`. Para apontar para outro ambiente, altere apenas o `app.json`.
- O bloco `submit` em `eas.json` ainda contém placeholders (`<apple-id>`, `<ascAppId>`, `<team-id>` e `./google-play-key.json`). Preencha antes de rodar `eas submit`.

## Validação obrigatória

Antes de considerar uma alteração finalizada:

1. `npx expo-doctor` deve passar sem erros.
2. `npx tsc --noEmit` deve passar sem erros.
3. O script de bridge (`WebViewBridge.tsx`) deve terminar com `true;`.
