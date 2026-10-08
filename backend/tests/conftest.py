import pytest
from app.core.database import engine, Base, SessionLocal
from app.models import OperatingSystem
from app.seed import seed_database

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not db.query(OperatingSystem).first():
            seed_database(db)
    finally:
        db.close()
    yield
