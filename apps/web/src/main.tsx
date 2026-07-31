import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { createTrpcClient, trpc } from "./api/trpc";
import { FeedbackProvider } from "./feedback/feedback";
import { ProfileProvider } from "./profile/ProfileProvider";
import { GamePreview } from "./dev/GamePreview";
import { CardGallery } from "./dev/CardGallery";
import "./styles.css";

const previewParam = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("preview") : null;

function Providers() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => createTrpcClient());

  let content = <App />;
  if (previewParam === "cards") {
    content = <CardGallery />;
  } else if (previewParam !== null) {
    content = <GamePreview />;
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <FeedbackProvider>
          <ProfileProvider>{content}</ProfileProvider>
        </FeedbackProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <Providers />
  </StrictMode>
);
