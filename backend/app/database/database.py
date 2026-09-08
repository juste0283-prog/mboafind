"""Engine SQLAlchemy et initialisation de la base de donnees.

L'URL vient de la configuration centrale. SQLite en developpement,
PostgreSQL en production : seul le DATABASE_URL change..
"""

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine

from app.core.config import settings

_connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    connect_args=_connect_args,
)


def _configure_sqlite() -> None:
    """Active les foreign keys pour SQLite (desactivees par defaut)."""
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


if settings.DATABASE_URL.startswith("sqlite"):
    _configure_sqlite()


def init_db() -> None:
    """Cree les tables si elles n'existent pas (developpement uniquement..

    En production, utiliser exclusivement les migrations Alembic.,
    """
    from app.models import Base  # import tardif pour eviter les cycles

    Base.metadata.create_all(bind=engine)