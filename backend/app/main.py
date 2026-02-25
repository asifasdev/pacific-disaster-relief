from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal
from uuid import uuid4
from datetime import datetime

@app.post("/seed")
def seed():
    # Clear existing
    EVENTS.clear()
    REQUESTS.clear()

    # Create demo events
    e1 = Event(id=str(uuid4()), name="Cyclone Relief – Viti Levu 2026", region="Fiji", status="active")
    e2 = Event(id=str(uuid4()), name="Flood Response – Upolu", region="Samoa", status="planned")
    EVENTS[e1.id] = e1
    EVENTS[e2.id] = e2

    # Demo requests
    demo = [
        ("water", "high", "Suva", "Clean drinking water for 200 households"),
        ("medical", "high", "Lautoka", "First aid + insulin cold-chain needed"),
        ("shelter", "medium", "Nadi", "Tarpaulins + blankets for temporary shelters"),
        ("food", "medium", "Nausori", "Dry rations for 3 days (approx. 120 families)"),
        ("transport", "low", "Korovou", "4x4 vehicle required for supply run"),
    ]

    for cat, urg, loc, desc in demo:
        rid = str(uuid4())
        req = Request(
            id=rid,
            event_id=e1.id,
            category=cat,
            urgency=urg,
            location=loc,
            description=desc,
            status="new",
        )
        REQUESTS[rid] = req

    return {"seeded": True, "events": 2, "requests": len(demo)}

app = FastAPI(title="Pacific Disaster Relief API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------- Models -------

EventStatus = Literal["planned", "active", "closed"]

class EventCreate(BaseModel):
    name: str
    region: str
    status: EventStatus = "planned"

class Event(EventCreate):
    id: str

EVENTS: dict[str, Event] = {}

@app.get("/")
def root():
    return {"message": "Pacific Disaster Relief API — see /docs"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/events", response_model=Event)
def create_event(payload: EventCreate):
    eid = str(uuid4())
    event = Event(id=eid, **payload.model_dump())
    EVENTS[eid] = event
    return event

@app.get("/events", response_model=list[Event])
def list_events():
    return list(EVENTS.values())