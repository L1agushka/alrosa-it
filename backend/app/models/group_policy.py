from sqlalchemy import Column, Integer, String, JSON
from ..core.database import Base


class GroupPolicy(Base):
    """Independent policy for the department name in an inventory file."""
    __tablename__ = "group_policies"

    id = Column(Integer, primary_key=True)
    group_name = Column(String(255), nullable=False, unique=True, index=True)
    settings = Column(JSON, nullable=False)
    rules = Column(JSON, nullable=False)
