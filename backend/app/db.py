import os
from collections.abc import Generator

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session

# Load environment variables from .env.
load_dotenv()

# Fetch the Supabase connection variables.
USER = os.getenv("user")
PASSWORD = os.getenv("password")
HOST = os.getenv("host")
PORT = os.getenv("port")
DBNAME = os.getenv("dbname")

missing = [
    name
    for name, value in {
        "user": USER,
        "password": PASSWORD,
        "host": HOST,
        "port": PORT,
        "dbname": DBNAME,
    }.items()
    if not value
]
if missing:
    raise RuntimeError(
        "Missing database environment variables: "
        + ", ".join(missing)
        + ". Set them in backend/.env."
    )

# Construct the SQLAlchemy connection string.
DATABASE_URL = (
    f"postgresql+psycopg2://{USER}:{PASSWORD}@{HOST}:{PORT}/{DBNAME}?sslmode=require"
)

# Create the SQLAlchemy engine.
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
