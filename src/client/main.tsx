import { createRoot } from "react-dom/client";
import { EventsScreen } from "./events-screen.tsx";
import "./styles.css";

const rootEl = document.getElementById("root");
if (rootEl == null) {
  throw new Error("missing #root");
}

createRoot(rootEl).render(
  <EventsScreen
    events={[]}
    error={null}
    loading={false}
    onRefresh={() => {}}
    newIds={new Set()}
    homeId={1}
    pollMs={4000}
  />,
);
