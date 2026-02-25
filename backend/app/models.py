import uuid

from sqlalchemy import Column, ForeignKey, String
from sqlalchemy.orm import relationship

from .db import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    region = Column(String, nullable=False)
    status = Column(String, nullable=False, default="planned")

    requests = relationship("Request", back_populates="event", cascade="all, delete-orphan")


class Request(Base):
    __tablename__ = "requests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String, ForeignKey("events.id"), nullable=False)
    category = Column(String, nullable=False)
    urgency = Column(String, nullable=False)
    location = Column(String, nullable=False)
    description = Column(String, nullable=False)
    status = Column(String, nullable=False, default="new")

    event = relationship("Event", back_populates="requests")
