import { useEffect, useState } from "react";
import "./App.css";

type Event = {
  id: string;
  name: string;
  region: string;
  status: "planned" | "active" | "closed";
};

const API = "http://127.0.0.1:8000";

export default function App() {
  const [events, setEvents] = useState<Event[]>([]);
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadEvents() {
    const res = await fetch(`${API}/events`);
    const data = await res.json();
    setEvents(data);
  }

  async function createEvent() {
    setError(null);
    if (!name.trim() || !region.trim()) {
      setError("Please enter both an event name and region.");
      return;
    }

    await fetch(`${API}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, region, status: "planned" }),
    });

    setName("");
    setRegion("");
    loadEvents();
  }

  useEffect(() => {
    loadEvents();
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1>Pacific Disaster Relief</h1>

      <h2>Create Event</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          placeholder="Event name (e.g., Cyclone Relief 2026)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="Region (e.g., Fiji)"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        />
        <button onClick={createEvent}>Create</button>
      </div>

      {error && <p style={{ marginTop: 0 }}>{error}</p>}

      <h2>Events</h2>
      {events.length === 0 ? (
        <p>No events yet. Create one above.</p>
      ) : (
        <ul>
          {events.map((e) => (
            <li key={e.id}>
              <b>{e.name}</b> — {e.region} ({e.status})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}