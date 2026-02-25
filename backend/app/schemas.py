from typing import Literal

from pydantic import BaseModel, ConfigDict

EventStatus = Literal["planned", "active", "closed"]
RequestStatus = Literal["new", "assigned", "in_progress", "completed"]
Urgency = Literal["low", "medium", "high"]
Category = Literal["water", "food", "medical", "shelter", "transport", "other"]


class EventBase(BaseModel):
    name: str
    region: str
    status: EventStatus = "planned"


class EventCreate(EventBase):
    pass


class EventRead(EventBase):
    id: str

    model_config = ConfigDict(from_attributes=True)


class RequestBase(BaseModel):
    event_id: str
    category: Category
    urgency: Urgency
    location: str
    description: str
    status: RequestStatus = "new"


class RequestCreate(RequestBase):
    pass


class RequestRead(RequestBase):
    id: str

    model_config = ConfigDict(from_attributes=True)


class RequestUpdate(BaseModel):
    event_id: str | None = None
    status: RequestStatus | None = None
    urgency: Urgency | None = None
    category: Category | None = None
    location: str | None = None
    description: str | None = None
