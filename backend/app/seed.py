from sqlalchemy import func
from sqlalchemy.orm import Session

from .models import Event, Request


def seed_if_empty(db: Session):
    event_count = db.query(func.count(Event.id)).scalar() or 0
    if event_count > 0:
        return

    primary_event = Event(name="Cyclone Relief - Viti Levu 2026", region="Fiji", status="active")
    secondary_event = Event(name="Flood Response - Upolu", region="Samoa", status="planned")
    db.add_all([primary_event, secondary_event])
    db.flush()

    demo_requests = [
        ("water", "high", "Suva", "Clean drinking water for 200 households"),
        ("medical", "high", "Lautoka", "First aid plus insulin cold-chain needed"),
        ("shelter", "medium", "Nadi", "Tarpaulins and blankets for temporary shelters"),
        ("food", "medium", "Nausori", "Dry rations for 3 days, around 120 families"),
        ("transport", "low", "Korovou", "4x4 vehicle required for supply run"),
    ]

    requests = [
        Request(
            event_id=primary_event.id,
            category=category,
            urgency=urgency,
            location=location,
            description=description,
            status="new",
        )
        for category, urgency, location, description in demo_requests
    ]

    db.add_all(requests)
    db.commit()
