import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import { App } from "./components/App";
import { DAWApp } from "./components/daw/DAWApp";
import "./styles/tailwind.css";

function Router() {
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Route to DAW or Sequencer
  if (route === "/daw" || route.startsWith("/daw")) {
    return <DAWApp />;
  }

  return <App />;
}

const container = document.getElementById("root");
if (!container) throw new Error("Root element not found");

const root = createRoot(container);
root.render(<Router />);
