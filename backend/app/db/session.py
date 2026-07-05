from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from backend.app.core.config import DEFAULT_DATABASE_URL


class Base(DeclarativeBase):
    pass


def create_engine_for_url(database_url: str = DEFAULT_DATABASE_URL):
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    return create_engine(database_url, connect_args=connect_args, future=True)


def create_session_factory(engine):
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


engine = create_engine_for_url()
SessionLocal = create_session_factory(engine)


def init_db(bind_engine=engine) -> None:
    from backend.app.db import models  # noqa: F401

    Base.metadata.create_all(bind=bind_engine)
