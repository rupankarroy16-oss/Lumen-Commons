import asyncio

from sqlalchemy import select

from app.database import SessionLocal, initialize_local_database
from app.models import AggregateMetric, Campaign


async def seed() -> None:
    await initialize_local_database()
    async with SessionLocal() as session:
        existing = await session.scalar(
            select(Campaign).where(Campaign.public_id == "harbor-park-2026")
        )
        if existing is not None:
            return
        session.add(
            Campaign(
                public_id="harbor-park-2026",
                title="Harbor Park evening access",
                public_requirement="Residents of North Harbor aged 16+ may submit one response.",
                district_label="North Harbor",
                network="preview",
                active=True,
            )
        )
        session.add(AggregateMetric(campaign_public_id="harbor-park-2026"))
        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
