import { createContext, useContext, useMemo, useState, ReactNode } from "react";

// Lets a route (e.g. app/index.tsx) tell the root splash overlay
// "the destination screen is actually decided, you can fade out now"
// instead of the splash guessing a fixed duration and risking a
// reveal of an unstyled in-between loading state.
type AppReadyContextValue = {
  appReady: boolean;
  setAppReady: () => void;
};

const AppReadyContext = createContext<AppReadyContextValue | undefined>(
  undefined
);

export function AppReadyProvider({ children }: { children: ReactNode }) {
  const [appReady, setReady] = useState(false);

  const value = useMemo(
    () => ({
      appReady,
      setAppReady: () => setReady(true),
    }),
    [appReady]
  );

  return (
    <AppReadyContext.Provider value={value}>
      {children}
    </AppReadyContext.Provider>
  );
}

export function useAppReady() {
  const ctx = useContext(AppReadyContext);
  if (!ctx) {
    throw new Error("useAppReady must be used inside AppReadyProvider");
  }
  return ctx;
}