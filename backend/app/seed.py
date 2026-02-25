from sqlalchemy import func
from sqlalchemy.orm import Session

from .models import Event, Request


def seed_if_empty(db: Session):
    event_count = db.query(func.count(Event.id)).scalar() or 0
    if event_count > 0:
        return

    events = [
        Event(
            name="Vanuatu Earthquake Response - Port Vila (Dec 2024)",
            region="Vanuatu",
            status="active",
        ),
        Event(
            name="PNG Enga Landslide Response - Mulitaka (May 2024)",
            region="Papua New Guinea",
            status="active",
        ),
        Event(
            name="Vanuatu Cyclone Lola Early Recovery - Sanma and Penama (2024)",
            region="Vanuatu",
            status="planned",
        ),
    ]

    db.add_all(events)
    db.flush()

    realistic_requests = [
        (
            events[0].id,
            "medical",
            "high",
            "Port Vila",
            "Support trauma and emergency care for patients transferred from damaged facilities.",
            "assigned",
            "Dr. L. Iekau",
            "Ministry of Health Surge Team",
        ),
        (
            events[0].id,
            "shelter",
            "high",
            "Efate Island",
            "Temporary shelter kits requested for households displaced after the 7.3 earthquake.",
            "in_progress",
            "M. Tari",
            "Shelter Cluster Field Unit",
        ),
        (
            events[0].id,
            "water",
            "medium",
            "Port Vila",
            "Restore safe water access for communities with damaged pipelines and storage points.",
            "new",
            "A. Ravo",
            "WASH Infrastructure Team",
        ),
        (
            events[0].id,
            "transport",
            "medium",
            "Port Vila",
            "Fuel and transport support needed for medical evacuation and relief cargo movement.",
            "new",
            "K. Bani",
            "Logistics Access Cell",
        ),
        (
            events[1].id,
            "shelter",
            "high",
            "Mulitaka, Enga Province",
            "Emergency shelter materials required for families displaced by landslide debris.",
            "in_progress",
            "P. Timi",
            "IOM Site Support Team",
        ),
        (
            events[1].id,
            "food",
            "high",
            "Mulitaka, Enga Province",
            "Immediate food distribution requested while local supply routes remain disrupted.",
            "assigned",
            "R. Kumai",
            "Food Security Distribution Team",
        ),
        (
            events[1].id,
            "water",
            "high",
            "Mulitaka, Enga Province",
            "Safe drinking water and household purification supplies needed for temporary sites.",
            "new",
            "S. Yaka",
            "WASH Emergency Team",
        ),
        (
            events[1].id,
            "medical",
            "high",
            "Porgera-Paiela District",
            "Mobile health team support needed for trauma, wound care, and infection prevention.",
            "new",
            "N. Tuke",
            "Provincial Health Mobile Unit",
        ),
        (
            events[1].id,
            "transport",
            "medium",
            "Wabag",
            "Heavy equipment and road access support required to improve aid delivery corridors.",
            "new",
            "J. Kon",
            "Road Access and Transport Team",
        ),
        (
            events[2].id,
            "shelter",
            "medium",
            "Sola, Vanua Lava",
            "Roofing materials and weatherproof shelter repairs requested during early recovery.",
            "new",
            "C. Moli",
            "Shelter Recovery Group",
        ),
        (
            events[2].id,
            "food",
            "medium",
            "Northeast Malekula",
            "Community food assistance requested for households with crop and garden losses.",
            "new",
            "T. Sovu",
            "Community Food Support Team",
        ),
        (
            events[2].id,
            "water",
            "medium",
            "Penama Province",
            "Water system repairs and storage tanks needed after cyclone damage to infrastructure.",
            "new",
            "D. Iaris",
            "Rural Water Repair Unit",
        ),
    ]

    requests = [
        Request(
            event_id=event_id,
            category=category,
            urgency=urgency,
            location=location,
            description=description,
            status=status,
            assignee_name=assignee_name,
            assignee_team=assignee_team,
        )
        for (
            event_id,
            category,
            urgency,
            location,
            description,
            status,
            assignee_name,
            assignee_team,
        ) in realistic_requests
    ]

    db.add_all(requests)
    db.commit()
