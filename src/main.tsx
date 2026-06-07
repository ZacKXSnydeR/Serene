import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from "./AppRouter";
import { initApiClient } from "./api/client";
import "./styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Don't refetch aggressively on desktop app
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const startApp = async () => {
  await initApiClient();

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AppRouter />
      </QueryClientProvider>
    </React.StrictMode>
  );
};

startApp();
