from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings

settings = get_settings()
engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    echo=False,
)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


async def initialize_local_database() -> None:
    if settings.is_production or not settings.database_url.startswith("sqlite"):
        return
    from app.models import Base

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
