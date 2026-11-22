"""Persist group policies and original installed software for repeatable audits."""
from alembic import op
import sqlalchemy as sa

revision = "a120_group_policies"
down_revision = "9bfaee8f887e"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("group_policies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("group_name", sa.String(255), nullable=False),
        sa.Column("settings", sa.JSON(), nullable=False),
        sa.Column("rules", sa.JSON(), nullable=False))
    op.create_index("ix_group_policies_group_name", "group_policies", ["group_name"], unique=True)
    op.add_column("workstations", sa.Column("installed_software", sa.JSON(), nullable=True))

    # Preserve existing inventory and policies as independent starting snapshots.
    # The old file is read once, never used as a shared live policy afterwards.
    import json
    from pathlib import Path
    from app.schemas.group_policy import CustomRuleCreate, PolicySettings
    from app.services.group_policy import DEFAULT_RULES
    legacy = Path(__file__).resolve().parents[2] / "data" / "custom_rules.json"
    rules = DEFAULT_RULES
    if legacy.exists():
        source = json.loads(legacy.read_text(encoding="utf-8-sig"))
        rules = [{"id": item["id"], **CustomRuleCreate.model_validate(
            {k: v for k, v in item.items() if k != "id"}).model_dump()} for item in source]
    connection = op.get_bind()
    names = set(connection.execute(sa.text(
        "SELECT name FROM departments UNION SELECT department FROM workstations"
    )).scalars())
    names = {name.strip() for name in names if name and name.strip()} | {"Общий"}
    settings = PolicySettings().model_dump()
    for code, weight in connection.execute(sa.text("SELECT code, weight FROM criteria_weights")):
        if code in settings["weights"]:
            settings["weights"][code] = weight
    table = sa.table("group_policies", sa.column("group_name", sa.String),
                     sa.column("settings", sa.JSON), sa.column("rules", sa.JSON))
    for name in sorted(names):
        connection.execute(table.insert().values(group_name=name, settings=settings, rules=rules))
    connection.execute(sa.text("""
        UPDATE workstations SET installed_software = (
            SELECT COALESCE(json_agg(software.name), '[]'::json)
            FROM workstation_software JOIN software ON software.id = workstation_software.software_id
            WHERE workstation_software.workstation_id = workstations.id
        )
    """))


def downgrade():
    op.drop_column("workstations", "installed_software")
    op.drop_index("ix_group_policies_group_name", table_name="group_policies")
    op.drop_table("group_policies")
