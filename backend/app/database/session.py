from contextlib import asynccontextmanager
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.database.models import Generation


engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
)

async_session_maker = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def get_session() -> AsyncSession:
    async with async_session_maker() as session:
        yield session


@asynccontextmanager
async def lifespan_db():
    # Create tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Generation.metadata.create_all)
    yield
    # Cleanup on shutdown
    await engine.dispose()