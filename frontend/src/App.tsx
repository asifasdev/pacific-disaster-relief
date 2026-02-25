import { useEffect, useMemo, useState } from "react";

type Event = {
  id: string;
  name: string;
  region: string;
  status: "planned" | "active" | "closed";
};

type RequestItem = {
  id: string;
  event_id: string;
  category: "water" | "food" | "medical" | "shelter" | "transport" | "other";
  urgency: "low" | "medium" | "high";
  location: string;
  description: string;
  status: "new" | "assigned" | "in_progress" | "completed";
};

const API = "http://127.0.0.1:8000";

function Badge({ urgency }: { urgency: RequestItem["urgency"] }) {
  return <span className={`badge ${urgency}`}>{urgency.toUpperCase()}</span>;
}

export default function App() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [msg, setMsg] = useState<string>("");

  // Create event form
  const [ename, setEname] = useState("");
  const [eregion, setEregion] = useState("");

  // Create request form
  const [category, setCategory] = useState<RequestItem["category"]>("water");
  const [urgency, setUrgency] = useState<RequestItem["urgency"]>("high");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  async function loadEvents() {
    const res = await fetch(`${API}/events`);
    const data = await res.json();
    setEvents(data);
    // Fix: always select first event if nothing selected
    setSelectedEventId((prev) => prev || data?.[0]?.id || "");
  }

  async function loadRequests(eventId: string) {
    if (!eventId) return setRequests([]);
    const res = await fetch(`${API}/requests?event_id=${encodeURIComponent(eventId)}`);
    const data = await res.json();
    setRequests(data);
  }

  async function createEvent() {
    setMsg("");
    if (!ename.trim() || !eregion.trim()) {
      setMsg("Please enter event name and region.");
      return;
    }

    await fetch(`${API}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: ename, region: eregion, status: "planned" }),
    });

    setEname("");
    setEregion("");
    setMsg("Event created.");
    await loadEvents();
    setTimeout(() => setMsg(""), 1200);
  }

  async function createRequest() {
    setMsg("");
    if (!selectedEventId) {
      setMsg("Select an event first.");
      return;
    }
    if (!location.trim() || !description.trim()) {
      setMsg("Please enter location and description.");
      return;
    }

    await fetch(`${API}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: selectedEventId,
        category,
        urgency,
        location,
        description,
        status: "new",
      }),
    });

    setLocation("");
    setDescription("");
    setMsg("Request added.");
    await loadRequests(selectedEventId);
    setTimeout(() => setMsg(""), 1200);
  }

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    loadRequests(selectedEventId);
  }, [selectedEventId]);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId),
    [events, selectedEventId]
  );

  const kpis = useMemo(() => {
    const total = requests.length;
    const high = requests.filter((r) => r.urgency === "high" && r.status !== "completed").length;
    const open = requests.filter((r) => r.status !== "completed").length;
    return { total, high, open };
  }, [requests]);

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand">
          <div className="logo" />
          <div>
            <h1>Pacific Disaster Relief</h1>
            <div className="subtitle">
              Coordinator dashboard for disaster events — built for low-bandwidth island contexts
            </div>
          </div>
        </div>
      </div>

      {msg && (
        <div className="card" style={{ marginBottom: 12 }}>
          {msg}
        </div>
      )}

      <div className="grid">
        {/* Left column */}
        <div className="card">
          <h2>Event Control</h2>

          <label className="subtitle">Active event</label>
          <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} — {e.region} ({e.status})
              </option>
            ))}
          </select>

          <div style={{ height: 16 }} />

          <h2>Create Event</h2>
          <div className="row">
            <input placeholder="Event name" value={ename} onChange={(e) => setEname(e.target.value)} />
            <input placeholder="Region" value={eregion} onChange={(e) => setEregion(e.target.value)} />
          </div>
          <div style={{ height: 10 }} />
          <button onClick={createEvent}>Create Event</button>

          <div style={{ height: 18 }} />

          <h2>Create Request</h2>
          <div className="row">
            <select value={category} onChange={(e) => setCategory(e.target.value as any)}>
              <option value="water">Water</option>
              <option value="food">Food</option>
              <option value="medical">Medical</option>
              <option value="shelter">Shelter</option>
              <option value="transport">Transport</option>
              <option value="other">Other</option>
            </select>
            <select value={urgency} onChange={(e) => setUrgency(e.target.value as any)}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div style={{ height: 10 }} />
          <input placeholder="Location (village/area)" value={location} onChange={(e) => setLocation(e.target.value)} />
          <div style={{ height: 10 }} />
          <textarea
            rows={3}
            placeholder="Description (what is needed + who + how many)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div style={{ height: 10 }} />
          <button onClick={createRequest}>Add Request</button>
        </div>

        {/* Right column */}
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <h2>Overview</h2>
            <div className="kpis">
              <div className="kpi">
                <div className="kpiNum">{kpis.open}</div>
                <div className="kpiLab">Open requests</div>
              </div>
              <div className="kpi">
                <div className="kpiNum">{kpis.high}</div>
                <div className="kpiLab">High urgency (not done)</div>
              </div>
              <div className="kpi">
                <div className="kpiNum">{kpis.total}</div>
                <div className="kpiLab">Total requests</div>
              </div>
            </div>

            <div className="subtitle">
              {selectedEvent ? (
                <>
                  Viewing: <b>{selectedEvent.name}</b> — {selectedEvent.region} ({selectedEvent.status})
                </>
              ) : (
                "Loading events..."
              )}
            </div>
          </div>

          <div className="card">
            <h2>Requests</h2>
            <div className="list">
              {requests.length === 0 ? (
                <div className="subtitle">No requests yet. Add one from the left panel.</div>
              ) : (
                requests.map((r) => (
                  <div key={r.id} className="item">
                    <div className="itemTop">
                      <div>
                        <div className="itemTitle">
                          {r.category.toUpperCase()} — {r.location}
                        </div>
                        <div className="itemMeta">{r.description}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Badge urgency={r.urgency} />
                        <span className="badge">{r.status.replace("_", " ").toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}