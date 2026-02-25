from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal
from uuid import uuid4

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