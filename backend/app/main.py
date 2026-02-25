from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal
from uuid import uuid4

# ---------- Types ----------
EventStatus = Literal["planned", "active", "closed"]
RequestStatus = Literal["new", "assigned", "in_progress", "completed"]
Urgency = Literal["low", "medium", "high"]
Category = Literal["water", "food", "medical", "shelter", "transport", "other"]

# ---------- Models ----------
class EventCreate(BaseModel):
    name: str
    region: str
    status: EventStatus = "planned"

class Event(EventCreate):
    id: str

class RequestCreate(BaseModel):
    event_id: str
    category: Category
    urgency: Urgency
    location: str
    description: str
    status: RequestStatus = "new"

class Request(RequestCreate):
    id: str

# ---------- In-memory store ----------
EVENTS: dict[str, Event] = {}
REQUESTS: dict[str, Request] = {}

def seed_if_empty():
    """Preload demo data (only if store is empty)."""
    if EVENTS:
        return

    e1 = Event(id=str(uuid4()), name="Cyclone Relief – Viti Levu 2026", region="Fiji", status="active")
    e2 = Event(id=str(uuid4()), name="Flood Response – Upolu", region="Samoa", status="planned")
    EVENTS[e1.id] = e1
    EVENTS[e2.id] = e2

    demo_requests = [
        ("water", "high", "Suva", "Clean drinking water for 200 households"),
        ("medical", "high", "Lautoka", "First aid + insulin cold-chain needed"),
        ("shelter", "medium", "Nadi", "Tarpaulins + blankets for temporary shelters"),
        ("food", "medium", "Nausori", "Dry rations for 3 days (approx. 120 families)"),
        ("transport", "low", "Korovou", "4x4 vehicle required for supply run"),
    ]

    for cat, urg, loc, desc in demo_requests:
        rid = str(uuid4())
        REQUESTS[rid] = Request(
            id=rid,
            event_id=e1.id,
            category=cat,      # type: ignore
            urgency=urg,       # type: ignore
            location=loc,
            description=desc,
            status="new",
        )

@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_if_empty()
    yield

app = FastAPI(
    title="Pacific Disaster Relief API",
    version="0.3.0",
    lifespan=lifespan,
)

# CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Pacific Disaster Relief API", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok"}

# ---------- Events ----------
@app.get("/events", response_model=list[Event])
def list_events():
    return list(EVENTS.values())

@app.post("/events", response_model=Event)
def create_event(payload: EventCreate):
    eid = str(uuid4())
    event = Event(id=eid, **payload.model_dump())
    EVENTS[eid] = event
    return event

# ---------- Requests ----------
@app.get("/requests", response_model=list[Request])
def list_requests(event_id: str | None = None):
    items = list(REQUESTS.values())
    if event_id:
        items = [r for r in items if r.event_id == event_id]
    return items

@app.post("/requests", response_model=Request)
def create_request(payload: RequestCreate):
    if payload.event_id not in EVENTS:
        # keeping it simple for now
        return {"error": "event_id not found"}
    rid = str(uuid4())
    req = Request(id=rid, **payload.model_dump())
    REQUESTS[rid] = req
    return req