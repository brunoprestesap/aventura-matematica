import { useState, useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";

interface NetworkStatus {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: null,
    isInternetReachable: null,
  });

  useEffect(() => {
    // Lê o estado atual imediatamente no mount
    NetInfo.fetch().then((state) => {
      setStatus({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
      });
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      setStatus({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
      });
    });

    return unsubscribe;
  }, []);

  return status;
}
