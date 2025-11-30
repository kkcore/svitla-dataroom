from typing import Annotated

from fastapi import Depends
from sqlmodel import SQLModel, Session, create_engine

from config import DATABASE_URL

connect_args = {"check_same_thread": False}
engine = create_engine(DATABASE_URL, connect_args=connect_args)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_db_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_db_session)]


def cleanup_expired_sessions():
    from datetime import datetime

    from models import UserSession
    from sqlmodel import select

    with Session(engine) as session:
        expired = session.exec(
            select(UserSession).where(UserSession.expires_at < datetime.now())
        ).all()
        for user_session in expired:
            session.delete(user_session)
        session.commit()
