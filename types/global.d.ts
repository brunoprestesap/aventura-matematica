export {};

declare global {
  interface Window {
    __NATIVE_APP__?: boolean;
    __PLATFORM__?: string;
    ReactNativeWebView?: { postMessage: (msg: string) => void };
  }
}
