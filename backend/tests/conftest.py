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


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as session:
        token = session.post("/api/v1/auth/token", data={"username":"admin@alrosa.ru", "password":"admin123"})
        assert token.status_code == 200
        session.headers["Authorization"] = "Bearer " + token.json()["access_token"]
        yield session
