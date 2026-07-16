import React, {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

import LoadingOverlay from "../components/LoadingOverlay";

interface LoadingContextType {
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  loading: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(
  undefined
);

export const LoadingProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Loading...");

  const showLoading = (text?: string) => {
    if (text) {
      setMessage(text);
    } else {
      setMessage("Loading...");
    }

    setLoading(true);
  };

  const hideLoading = () => {
    setLoading(false);
  };

  const value = useMemo(
    () => ({
      loading,
      showLoading,
      hideLoading,
    }),
    [loading]
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}

      <LoadingOverlay
        visible={loading}
        message={message}
      />
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);

  if (!context) {
    throw new Error(
      "useLoading must be used inside LoadingProvider"
    );
  }

  return context;
};