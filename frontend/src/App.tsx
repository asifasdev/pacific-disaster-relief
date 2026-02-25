import { useState } from "react";
import "./App.css";

export default function App() {
  const [health, setHealth] = useState<string>("Not checked");

  async function checkHealth() {
    try {
      const res = await fetch("http://127.0.0.1:8000/health");
      const data = await res.json();
      setHealth(JSON.stringify(data));
    } catch {
      setHealth("API not reachable (is backend running?)");
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Pacific Disaster Relief</h1>
      <p>Coordinator dashboard (MVP)</p>

      <button onClick={checkHealth}>Check API health</button>
      <pre style={{ marginTop: 12 }}>{health}</pre>
    </div>
  );
}
