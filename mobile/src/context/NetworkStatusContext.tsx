import { useNetworkState } from "expo-network";
import { createContext, useContext, type ReactNode } from "react";

type NetworkStatus = {
  isOffline: boolean;
};

const NetworkStatusContext = createContext<NetworkStatus>({ isOffline: false });

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const state = useNetworkState();
  const isOffline =
    state.isConnected === false || state.isInternetReachable === false;

  return (
    <NetworkStatusContext.Provider value={{ isOffline }}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus(): NetworkStatus {
  return useContext(NetworkStatusContext);
}
