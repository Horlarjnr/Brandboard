from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session

from app.config import get_settings

settings = get_settings()
DATABASE_URL = settings.database_url

engine = create_engine(DATABASE_URL)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


def test_connection() -> None:
    """Test the database connection when explicitly called."""
    try:
        with engine.connect():
            print("Connection successful!")
    except SQLAlchemyError as exc:
        print(f"Failed to connect: {exc}")


if __name__ == "__main__":
    test_connection()
