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
  assignee_name: string | null;
  assignee_team: string | null;
  created_at: string;
  updated_at: string;
};

const API = "http://127.0.0.1:8000";

const CATEGORY_OPTIONS: RequestItem["category"][] = ["water", "food", "medical", "shelter", "transport", "other"];
const URGENCY_OPTIONS: RequestItem["urgency"][] = ["high", "medium", "low"];
const STATUS_OPTIONS: RequestItem["status"][] = ["new", "assigned", "in_progress", "completed"];

const CATEGORY_WORKFLOW: Record<RequestItem["category"], { lead: string; workflow: string; channel: string }> = {
  water: {
    lead: "WASH Cluster",
    workflow: "Damage check -> purification -> tanker/repair deployment",
    channel: "Daily WASH call, 08:30 local",
  },
  food: {
    lead: "Food Security Cluster",
    workflow: "Beneficiary verification -> ration staging -> last-mile handoff",
    channel: "Field logistics sync, 10:00 local",
  },
  medical: {
    lead: "Health Cluster",
    workflow: "Triage -> referral routing -> treatment + replenishment",
    channel: "Clinical incident room, every 4h",
  },
  shelter: {
    lead: "Shelter Cluster",
    workflow: "Site assessment -> kit dispatch -> household registration",
    channel: "Shelter operations standup, 09:00 local",
  },
  transport: {
    lead: "Logistics Cluster",
    workflow: "Route clearance -> dispatch slotting -> escort + proof of delivery",
    channel: "Route board review, every 6h",
  },
  other: {
    lead: "Operations Cell",
    workflow: "Intake -> classify -> assign specialist support",
    channel: "Operations desk queue, continuous",
  },
};

function toLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function urgencyRank(u: RequestItem["urgency"]) {
  return u === "high" ? 0 : u === "medium" ? 1 : 2;
}

function statusRank(s: RequestItem["status"]) {
  return s === "new" ? 0 : s === "assigned" ? 1 : s === "in_progress" ? 2 : 3;
}

function parseTime(value: string) {
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function formatAgo(value: string) {
  const ts = parseTime(value);
  if (!ts) return "unknown";
  const hours = Math.max(1, Math.floor((Date.now() - ts) / (1000 * 60 * 60)));
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h ago`;
}

function formatDateTime(value: string) {
  const ts = parseTime(value);
  if (!ts) return "unknown";
  return new Date(ts).toLocaleString();
}

function UrgencyBadge({ urgency }: { urgency: RequestItem["urgency"] }) {
  return <span className={`badge urgency ${urgency}`}>{urgency.toUpperCase()}</span>;
}

function StatusBadge({ status }: { status: RequestItem["status"] }) {
  return <span className={`badge status ${status}`}>{toLabel(status)}</span>;
}

export default function App() {
  const [screen, setScreen] = useState<"dashboard" | "monitor">("monitor");

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [msg, setMsg] = useState<string>("");

  const [ename, setEname] = useState("");
  const [eregion, setEregion] = useState("");

  const [category, setCategory] = useState<RequestItem["category"]>("water");
  const [urgency, setUrgency] = useState<RequestItem["urgency"]>("high");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeName, setAssigneeName] = useState("");
  const [assigneeTeam, setAssigneeTeam] = useState("");

  const [q, setQ] = useState("");
  const [urgFilter, setUrgFilter] = useState<"all" | RequestItem["urgency"]>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | RequestItem["status"]>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | RequestItem["category"]>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"urgency" | "status" | "category" | "location" | "updated">("urgency");
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");

  const [detailStatus, setDetailStatus] = useState<RequestItem["status"]>("new");
  const [detailAssigneeName, setDetailAssigneeName] = useState("");
  const [detailAssigneeTeam, setDetailAssigneeTeam] = useState("");

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
        assignee_name: assigneeName.trim() || null,
        assignee_team: assigneeTeam.trim() || null,
      }),
    });

    setLocation("");
    setDescription("");
    setAssigneeName("");
    setAssigneeTeam("");
    setMsg("Request added.");
    await loadRequests(selectedEventId);
    setTimeout(() => setMsg(""), 1200);
  }

  async function patchRequest(requestId: string, patch: Partial<RequestItem>) {
    await fetch(`${API}/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
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

  const locationOptions = useMemo(() => {
    return Array.from(new Set(requests.map((r) => r.location))).sort((a, b) => a.localeCompare(b));
  }, [requests]);

  useEffect(() => {
    if (locationFilter !== "all" && !locationOptions.includes(locationFilter)) {
      setLocationFilter("all");
    }
  }, [locationFilter, locationOptions]);

  const kpis = useMemo(() => {
    const total = requests.length;
    const high = requests.filter((r) => r.urgency === "high" && r.status !== "completed").length;
    const open = requests.filter((r) => r.status !== "completed").length;
    const completed = requests.filter((r) => r.status === "completed").length;
    return { total, high, open, completed };
  }, [requests]);

  const monitored = useMemo(() => {
    const norm = q.trim().toLowerCase();
    let items = [...requests];

    if (urgFilter !== "all") items = items.filter((r) => r.urgency === urgFilter);
    if (statusFilter !== "all") items = items.filter((r) => r.status === statusFilter);
    if (categoryFilter !== "all") items = items.filter((r) => r.category === categoryFilter);
    if (locationFilter !== "all") items = items.filter((r) => r.location === locationFilter);

    if (norm) {
      items = items.filter((r) => {
        return (
          r.location.toLowerCase().includes(norm) ||
          r.description.toLowerCase().includes(norm) ||
          r.category.toLowerCase().includes(norm) ||
          r.status.toLowerCase().includes(norm) ||
          (r.assignee_name || "").toLowerCase().includes(norm) ||
          (r.assignee_team || "").toLowerCase().includes(norm)
        );
      });
    }

    items.sort((a, b) => {
      if (sortBy === "urgency") return urgencyRank(a.urgency) - urgencyRank(b.urgency);
      if (sortBy === "status") return statusRank(a.status) - statusRank(b.status);
      if (sortBy === "category") return a.category.localeCompare(b.category);
      if (sortBy === "updated") return parseTime(b.updated_at) - parseTime(a.updated_at);
      return a.location.localeCompare(b.location);
    });

    return items;
  }, [requests, q, urgFilter, statusFilter, categoryFilter, locationFilter, sortBy]);

  const categoryStats = useMemo(() => {
    return CATEGORY_OPTIONS.map((entry) => {
      const items = monitored.filter((r) => r.category === entry);
      return {
        key: entry,
        count: items.length,
        high: items.filter((r) => r.urgency === "high" && r.status !== "completed").length,
      };
    }).filter((row) => row.count > 0);
  }, [monitored]);

  const locationStats = useMemo(() => {
    return locationOptions
      .map((place) => {
        const items = monitored.filter((r) => r.location === place);
        return {
          location: place,
          count: items.length,
          open: items.filter((r) => r.status !== "completed").length,
        };
      })
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [locationOptions, monitored]);

  const selectedRequest = useMemo(
    () => monitored.find((r) => r.id === selectedRequestId) ?? monitored[0] ?? null,
    [monitored, selectedRequestId]
  );

  useEffect(() => {
    if (!selectedRequest) {
      if (selectedRequestId) setSelectedRequestId("");
      return;
    }
    if (selectedRequest.id !== selectedRequestId) setSelectedRequestId(selectedRequest.id);
  }, [selectedRequest, selectedRequestId]);

  useEffect(() => {
    if (!selectedRequest) return;
    setDetailStatus(selectedRequest.status);
    setDetailAssigneeName(selectedRequest.assignee_name || "");
    setDetailAssigneeTeam(selectedRequest.assignee_team || "");
  }, [selectedRequest]);

  const activityFeed = useMemo(() => {
    return [...monitored]
      .sort((a, b) => parseTime(b.updated_at) - parseTime(a.updated_at))
      .slice(0, 8)
      .map((r) => ({
        id: r.id,
        status: r.status,
        urgency: r.urgency,
        message: `${toLabel(r.category)} update at ${r.location}: ${toLabel(r.status)} (${r.assignee_team || "Operations Team"}).`,
        at: formatAgo(r.updated_at),
      }));
  }, [monitored]);

  const topCategoryCount = Math.max(1, ...categoryStats.map((c) => c.count));
  const topLocationCount = Math.max(1, ...locationStats.map((c) => c.count));

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand">
          <div className="logo" />
          <div>
            <h1>Pacific Disaster Relief</h1>
            <div className="subtitle">Operational monitoring for requests: priority, ownership, and delivery progress.</div>
          </div>
        </div>

        <div className="tabs">
          <button className={screen === "monitor" ? "tab active" : "tab"} onClick={() => setScreen("monitor")}>Monitor</button>
          <button className={screen === "dashboard" ? "tab active" : "tab"} onClick={() => setScreen("dashboard")}>Create</button>
        </div>
      </div>

      {msg && <div className="card banner">{msg}</div>}

      <div className="card eventStrip">
        <h2>Active Event</h2>
        <div className="controlStrip">
          <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} - {e.region} ({e.status})
              </option>
            ))}
          </select>

          <div className="subtitle">
            {selectedEvent ? (
              <>
                Live view: <b>{selectedEvent.name}</b> in {selectedEvent.region}
              </>
            ) : (
              "Loading events..."
            )}
          </div>
        </div>
      </div>

      {screen === "dashboard" ? (
        <div className="split">
          <div className="card">
            <h2>Create Event</h2>
            <div className="row">
              <input placeholder="Event name" value={ename} onChange={(e) => setEname(e.target.value)} />
              <input placeholder="Region" value={eregion} onChange={(e) => setEregion(e.target.value)} />
            </div>
            <div className="spacer" />
            <button onClick={createEvent}>Create Event</button>

            <div className="spacerLg" />

            <h2>Create Request</h2>
            <div className="row">
              <select value={category} onChange={(e) => setCategory(e.target.value as RequestItem["category"])}>
                {CATEGORY_OPTIONS.map((entry) => (
                  <option key={entry} value={entry}>
                    {toLabel(entry)}
                  </option>
                ))}
              </select>
              <select value={urgency} onChange={(e) => setUrgency(e.target.value as RequestItem["urgency"])}>
                {URGENCY_OPTIONS.map((entry) => (
                  <option key={entry} value={entry}>
                    {toLabel(entry)}
                  </option>
                ))}
              </select>
            </div>
            <div className="spacer" />
            <input placeholder="Location (village/area)" value={location} onChange={(e) => setLocation(e.target.value)} />
            <div className="spacer" />
            <textarea
              rows={3}
              placeholder="Description (what is needed + who + how many)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="spacer" />
            <div className="row">
              <input
                placeholder="Assignee name (optional)"
                value={assigneeName}
                onChange={(e) => setAssigneeName(e.target.value)}
              />
              <input
                placeholder="Assignee team (optional)"
                value={assigneeTeam}
                onChange={(e) => setAssigneeTeam(e.target.value)}
              />
            </div>
            <div className="spacer" />
            <button onClick={createRequest}>Add Request</button>
          </div>

          <div>
            <div className="card kpiGrid">
              <div className="kpi">
                <div className="kpiNum">{kpis.open}</div>
                <div className="kpiLab">Open</div>
              </div>
              <div className="kpi">
                <div className="kpiNum">{kpis.high}</div>
                <div className="kpiLab">High Priority</div>
              </div>
              <div className="kpi">
                <div className="kpiNum">{kpis.completed}</div>
                <div className="kpiLab">Completed</div>
              </div>
              <div className="kpi">
                <div className="kpiNum">{kpis.total}</div>
                <div className="kpiLab">Total</div>
              </div>
            </div>

            <div className="card" style={{ marginTop: 12 }}>
              <h2>Recent Requests</h2>
              <div className="requestList">
                {requests.length === 0 ? (
                  <div className="subtitle">No requests yet.</div>
                ) : (
                  requests.slice(0, 8).map((r) => (
                    <div key={r.id} className="queueItem">
                      <div>
                        <div className="itemTitle">{toLabel(r.category)} - {r.location}</div>
                        <div className="itemMeta">{r.description}</div>
                        <div className="smallMeta">{r.assignee_name || "Unassigned"} - {r.assignee_team || "No team"}</div>
                      </div>
                      <div className="badgeCluster">
                        <UrgencyBadge urgency={r.urgency} />
                        <StatusBadge status={r.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="monitorShell">
          <div className="card">
            <h2>Filter + Sort</h2>
            <div className="monitorBar">
              <input
                placeholder="Search location, status, category, assignee"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <select value={urgFilter} onChange={(e) => setUrgFilter(e.target.value as "all" | RequestItem["urgency"])}>
                <option value="all">All urgencies</option>
                {URGENCY_OPTIONS.map((entry) => (
                  <option key={entry} value={entry}>{toLabel(entry)}</option>
                ))}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | RequestItem["status"])}>
                <option value="all">All statuses</option>
                {STATUS_OPTIONS.map((entry) => (
                  <option key={entry} value={entry}>{toLabel(entry)}</option>
                ))}
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
                <option value="urgency">Sort by urgency</option>
                <option value="status">Sort by status</option>
                <option value="category">Sort by category</option>
                <option value="location">Sort by location</option>
                <option value="updated">Sort by last update</option>
              </select>
            </div>

            <div className="secondaryFilters">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as "all" | RequestItem["category"])}
              >
                <option value="all">All categories</option>
                {CATEGORY_OPTIONS.map((entry) => (
                  <option key={entry} value={entry}>{toLabel(entry)}</option>
                ))}
              </select>
              <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
                <option value="all">All locations</option>
                {locationOptions.map((entry) => (
                  <option key={entry} value={entry}>{entry}</option>
                ))}
              </select>
              <button
                className="btnGhost"
                onClick={() => {
                  setQ("");
                  setUrgFilter("all");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                  setLocationFilter("all");
                  setSortBy("urgency");
                }}
              >
                Reset filters
              </button>
            </div>
          </div>

          <div className="vizGrid">
            <div className="card">
              <h2>Category Load</h2>
              {categoryStats.length === 0 ? (
                <div className="subtitle">No requests in this view.</div>
              ) : (
                <div className="chartList">
                  {categoryStats.map((entry) => (
                    <button
                      key={entry.key}
                      className={categoryFilter === entry.key ? "chartRow active" : "chartRow"}
                      onClick={() => setCategoryFilter(entry.key)}
                    >
                      <div className="chartHeader">
                        <span>{toLabel(entry.key)}</span>
                        <span>{entry.count} req</span>
                      </div>
                      <div className="barTrack">
                        <div className={`barFill cat-${entry.key}`} style={{ width: `${(entry.count / topCategoryCount) * 100}%` }} />
                      </div>
                      <div className="smallMeta">{entry.high} high-priority open</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h2>Location Demand</h2>
              {locationStats.length === 0 ? (
                <div className="subtitle">No requests in this view.</div>
              ) : (
                <div className="chartList">
                  {locationStats.slice(0, 8).map((entry) => (
                    <button
                      key={entry.location}
                      className={locationFilter === entry.location ? "chartRow active" : "chartRow"}
                      onClick={() => setLocationFilter(entry.location)}
                    >
                      <div className="chartHeader">
                        <span>{entry.location}</span>
                        <span>{entry.count} req</span>
                      </div>
                      <div className="barTrack">
                        <div className="barFill location" style={{ width: `${(entry.count / topLocationCount) * 100}%` }} />
                      </div>
                      <div className="smallMeta">{entry.open} open</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="monitorLayout">
            <div className="card">
              <h2>Live Request Queue ({monitored.length})</h2>
              {monitored.length === 0 ? (
                <div className="subtitle">No matching requests.</div>
              ) : (
                <div className="requestList">
                  {monitored.map((r) => (
                    <button
                      key={r.id}
                      className={selectedRequestId === r.id ? "queueItem active" : "queueItem"}
                      onClick={() => setSelectedRequestId(r.id)}
                    >
                      <div className="queueMain">
                        <div className="itemTitle">{toLabel(r.category)} - {r.location}</div>
                        <div className="itemMeta">{r.description}</div>
                        <div className="smallMeta">
                          {r.assignee_name || "Unassigned"} - {r.assignee_team || "No team"} - Updated {formatAgo(r.updated_at)}
                        </div>
                      </div>
                      <div className="badgeCluster">
                        <UrgencyBadge urgency={r.urgency} />
                        <StatusBadge status={r.status} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="card detailPanel">
              <h2>Request Detail</h2>
              {!selectedRequest ? (
                <div className="subtitle">Select a request to inspect ownership, workflow, and progress.</div>
              ) : (
                <>
                  <div className="detailHead">
                    <div>
                      <div className="detailTitle">{toLabel(selectedRequest.category)} intervention</div>
                      <div className="detailLoc">{selectedRequest.location}</div>
                    </div>
                    <div className="badgeCluster">
                      <UrgencyBadge urgency={selectedRequest.urgency} />
                      <StatusBadge status={selectedRequest.status} />
                    </div>
                  </div>

                  <div className="detailBody">
                    <p>{selectedRequest.description}</p>
                    <div className="detailGrid">
                      <div>
                        <div className="detailLabel">Lead</div>
                        <div>{CATEGORY_WORKFLOW[selectedRequest.category].lead}</div>
                      </div>
                      <div>
                        <div className="detailLabel">Assigned To</div>
                        <div>{selectedRequest.assignee_name || "Unassigned"}</div>
                      </div>
                      <div>
                        <div className="detailLabel">Assigned Team</div>
                        <div>{selectedRequest.assignee_team || "No team"}</div>
                      </div>
                      <div>
                        <div className="detailLabel">How It Happens</div>
                        <div>{CATEGORY_WORKFLOW[selectedRequest.category].workflow}</div>
                      </div>
                      <div>
                        <div className="detailLabel">Coordination Channel</div>
                        <div>{CATEGORY_WORKFLOW[selectedRequest.category].channel}</div>
                      </div>
                      <div>
                        <div className="detailLabel">Timeline</div>
                        <div>Created {formatDateTime(selectedRequest.created_at)}</div>
                        <div>Updated {formatDateTime(selectedRequest.updated_at)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="detailActions">
                    <div className="row">
                      <select value={detailStatus} onChange={(e) => setDetailStatus(e.target.value as RequestItem["status"])}>
                        {STATUS_OPTIONS.map((entry) => (
                          <option key={entry} value={entry}>{toLabel(entry)}</option>
                        ))}
                      </select>
                      <input
                        value={detailAssigneeName}
                        onChange={(e) => setDetailAssigneeName(e.target.value)}
                        placeholder="Assignee name"
                      />
                      <input
                        value={detailAssigneeTeam}
                        onChange={(e) => setDetailAssigneeTeam(e.target.value)}
                        placeholder="Assignee team"
                      />
                    </div>
                    <div className="spacer" />
                    <button
                      onClick={async () => {
                        await patchRequest(selectedRequest.id, {
                          status: detailStatus,
                          assignee_name: detailAssigneeName.trim() || null,
                          assignee_team: detailAssigneeTeam.trim() || null,
                        });
                      }}
                    >
                      Save Update
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card">
            <h2>Operational Updates</h2>
            {activityFeed.length === 0 ? (
              <div className="subtitle">No updates yet for this filter view.</div>
            ) : (
              <div className="feedList">
                {activityFeed.map((item) => (
                  <div key={item.id} className={`feedItem ${item.status}`}>
                    <div className="feedText">{item.message}</div>
                    <div className="feedMeta">
                      <UrgencyBadge urgency={item.urgency} />
                      <span>{item.at}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
