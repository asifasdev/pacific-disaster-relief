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

function statusLabel(s: RequestItem["status"]) {
  return s.replace("_", " ").toUpperCase();
}

export default function App() {
  const [screen, setScreen] = useState<"dashboard" | "monitor">("monitor");

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

  // Monitor filters
  const [q, setQ] = useState("");
  const [urgFilter, setUrgFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | RequestItem["status"]>("all");
  const [sortBy, setSortBy] = useState<"urgency" | "status" | "category" | "location">("urgency");

  async function loadEvents() {
    const res = await fetch(`${API}/events`);
    const data = await res.json();
    setEvents(data);
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
    if (!selectedEventId) return setMsg("Select an event first.");
    if (!location.trim() || !description.trim()) return setMsg("Please enter location and description.");

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

  async function updateRequestStatus(requestId: string, status: RequestItem["status"]) {
    await fetch(`${API}/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadRequests(selectedEventId);
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

  const monitored = useMemo(() => {
    const norm = q.trim().toLowerCase();
    let items = [...requests];

    if (urgFilter !== "all") items = items.filter((r) => r.urgency === urgFilter);
    if (statusFilter !== "all") items = items.filter((r) => r.status === statusFilter);

    if (norm) {
      items = items.filter((r) => {
        return (
          r.location.toLowerCase().includes(norm) ||
          r.description.toLowerCase().includes(norm) ||
          r.category.toLowerCase().includes(norm) ||
          r.status.toLowerCase().includes(norm)
        );
      });
    }

    const urgencyRank = (u: RequestItem["urgency"]) => (u === "high" ? 0 : u === "medium" ? 1 : 2);
    const statusRank = (s: RequestItem["status"]) =>
      s === "new" ? 0 : s === "assigned" ? 1 : s === "in_progress" ? 2 : 3;

    items.sort((a, b) => {
      if (sortBy === "urgency") return urgencyRank(a.urgency) - urgencyRank(b.urgency);
      if (sortBy === "status") return statusRank(a.status) - statusRank(b.status);
      if (sortBy === "category") return a.category.localeCompare(b.category);
      return a.location.localeCompare(b.location);
    });

    return items;
  }, [requests, q, urgFilter, statusFilter, sortBy]);

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand">
          <div className="logo" />
          <div>
            <h1>Pacific Disaster Relief</h1>
            <div className="subtitle">Monitoring requests in real time — triage, status, and follow-up.</div>
          </div>
        </div>

        <div className="tabs">
          <button className={screen === "monitor" ? "tab active" : "tab"} onClick={() => setScreen("monitor")}>
            Monitor Requests
          </button>
          <button className={screen === "dashboard" ? "tab active" : "tab"} onClick={() => setScreen("dashboard")}>
            Create & Overview
          </button>
        </div>
      </div>

      {msg && (
        <div className="card" style={{ marginBottom: 12 }}>
          {msg}
        </div>
      )}

      {/* Global event selection */}
      <div className="card" style={{ marginBottom: 12 }}>
        <h2>Active Event</h2>
        <div className="row">
          <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} — {e.region} ({e.status})
              </option>
            ))}
          </select>

          <div className="subtitle" style={{ alignSelf: "center" }}>
            {selectedEvent ? (
              <>
                Viewing: <b>{selectedEvent.name}</b> — {selectedEvent.region}
              </>
            ) : (
              "Loading events..."
            )}
          </div>
        </div>
      </div>

      {screen === "dashboard" ? (
        <div className="split">
          {/* Left */}
          <div className="card">
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

          {/* Right */}
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
                          <span className="badge">{statusLabel(r.status)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <h2>Request Monitor</h2>

          <div className="monitorBar">
            <input
              placeholder="Search (location, description, category, status)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            <select value={urgFilter} onChange={(e) => setUrgFilter(e.target.value as any)}>
              <option value="all">All urgencies</option>
              <option value="high">High urgency</option>
              <option value="medium">Medium urgency</option>
              <option value="low">Low urgency</option>
            </select>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
              <option value="all">All statuses</option>
              <option value="new">New</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>

            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
              <option value="urgency">Sort: urgency</option>
              <option value="status">Sort: status</option>
              <option value="category">Sort: category</option>
              <option value="location">Sort: location</option>
            </select>
          </div>

          <div style={{ height: 12 }} />

          {monitored.length === 0 ? (
            <div className="subtitle">No matching requests.</div>
          ) : (
            <div className="table">
              <div className="thead">
                <div>Urgency</div>
                <div>Category</div>
                <div>Location</div>
                <div>Description</div>
                <div>Status</div>
                <div>Update</div>
              </div>

              {monitored.map((r) => (
                <div key={r.id} className="trow">
                  <div><Badge urgency={r.urgency} /></div>
                  <div className="mono">{r.category.toUpperCase()}</div>
                  <div>{r.location}</div>
                  <div className="desc">{r.description}</div>
                  <div><span className="badge">{statusLabel(r.status)}</span></div>
                  <div>
                    <select
                      value={r.status}
                      onChange={(e) => updateRequestStatus(r.id, e.target.value as any)}
                    >
                      <option value="new">New</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}