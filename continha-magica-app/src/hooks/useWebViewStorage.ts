import { useCallback } from "react";
import * as SecureStore from "expo-secure-store";

/*
  Chaves do localStorage do PWA que devem ser sincronizadas nativamente.
  SecureStore usa o Keychain (iOS) e Keystore (Android) — dados persistem
  entre sessões mesmo quando o WebView limpa sua memória no iOS.

  Limite do SecureStore: 2KB por valor.
  Os dados deste app (nome, ano, histórico curto) ficam bem dentro desse limite.
  Se o histórico crescer além de 2KB, migre "continha-magica-history"
  para @react-native-async-storage/async-storage.
*/
const SYNC_KEYS = [
  "continha-magica-grade",
  "continha-magica-history",
  "continha-magica-user-name",
  "continha-magica-mastery-v1",
] as const;

type SyncKey = (typeof SYNC_KEYS)[number];

function isSyncKey(key: string): key is SyncKey {
  return SYNC_KEYS.includes(key as SyncKey);
}

export function useWebViewStorage() {
  const saveItem = useCallback(async (key: string, value: string) => {
    if (!isSyncKey(key)) return;
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.warn("[Storage] Erro ao salvar:", key, error);
    }
  }, []);

  const removeItem = useCallback(async (key: string) => {
    if (!isSyncKey(key)) return;
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn("[Storage] Erro ao remover:", key, error);
    }
  }, []);

  /*
    Remove todas as chaves sincronizadas — espelha localStorage.clear() do
    PWA para evitar que dados antigos sejam re-injetados na próxima sessão.
  */
  const clearItems = useCallback(async () => {
    await Promise.all(
      SYNC_KEYS.map(async (key) => {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (error) {
          console.warn("[Storage] Erro ao limpar:", key, error);
        }
      })
    );
  }, []);

  /*
    Carrega todos os valores salvos para pré-popular o localStorage
    do WebView antes da página carregar — crítico para iOS, onde o
    localStorage do WKWebView pode ser limpo entre sessões.
  */
  const loadAllItems = useCallback(async (): Promise<Record<string, string>> => {
    const entries: Record<string, string> = {};
    await Promise.all(
      SYNC_KEYS.map(async (key) => {
        try {
          const value = await SecureStore.getItemAsync(key);
          if (value !== null) {
            entries[key] = value;
          }
        } catch {
          // Ignora erros de leitura individuais — chave pode não existir ainda
        }
      })
    );
    return entries;
  }, []);

  return { saveItem, removeItem, clearItems, loadAllItems };
}
