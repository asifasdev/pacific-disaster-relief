from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .db import Base, engine, get_db, SessionLocal
from .models import Event, Request
from .schemas import EventCreate, EventRead, RequestCreate, RequestRead, RequestUpdate
from .seed import seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()

    yield


app = FastAPI(title="Pacific Disaster Relief API", version="0.4.0", lifespan=lifespan)

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


@app.get("/events", response_model=list[EventRead])
def list_events(db: Session = Depends(get_db)):
    return db.query(Event).all()


@app.post("/events", response_model=EventRead)
def create_event(payload: EventCreate, db: Session = Depends(get_db)):
    event = Event(**payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@app.get("/requests", response_model=list[RequestRead])
def list_requests(event_id: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Request)
    if event_id:
        query = query.filter(Request.event_id == event_id)
    return query.order_by(Request.updated_at.desc()).all()


@app.post("/requests", response_model=RequestRead)
def create_request(payload: RequestCreate, db: Session = Depends(get_db)):
    event_exists = db.query(Event).filter(Event.id == payload.event_id).first()
    if not event_exists:
        raise HTTPException(status_code=400, detail="event_id not found")

    request_item = Request(**payload.model_dump())
    db.add(request_item)
    db.commit()
    db.refresh(request_item)
    return request_item


@app.patch("/requests/{request_id}", response_model=RequestRead)
def update_request(request_id: str, payload: RequestUpdate, db: Session = Depends(get_db)):
    request_item = db.query(Request).filter(Request.id == request_id).first()
    if not request_item:
        raise HTTPException(status_code=404, detail="request not found")

    patch = payload.model_dump(exclude_unset=True)

    if "event_id" in patch:
        event_exists = db.query(Event).filter(Event.id == patch["event_id"]).first()
        if not event_exists:
            raise HTTPException(status_code=400, detail="event_id not found")

    for field, value in patch.items():
        setattr(request_item, field, value)

    db.commit()
    db.refresh(request_item)
    return request_item
