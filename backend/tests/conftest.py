import pytest
from app.database import engine, Base, SessionLocal
from app.models import TargetOSProfile
from app.seed import seed_database

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not db.query(TargetOSProfile).first():
            seed_database(db)
    finally:
        db.close()
    yield
