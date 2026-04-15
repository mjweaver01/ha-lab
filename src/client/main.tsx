import { createRoot } from "react-dom/client";
import { EventsScreen } from "./events-screen.tsx";
import { useEventsPoll } from "./hooks/use-events-poll.ts";
import "./styles.css";

function App() {
  const { events, error, loading, onRefresh, newIds, homeId, pollMs } =
    useEventsPoll();
  return (
    <EventsScreen
      events={events}
      error={error}
      loading={loading}
      onRefresh={onRefresh}
      newIds={newIds}
      homeId={homeId}
      pollMs={pollMs}
    />
  );
}

const rootEl = document.getElementById("root");
if (rootEl == null) {
  throw new Error("missing #root");
}

createRoot(rootEl).render(<App />);
