"""PrecisionSession accepts legacy JSON where refs were stored as {\"id\": ...} objects."""

from app.models import PrecisionSession, PrecisionSessionStatus, TableType


def test_legacy_nested_program_plan_table_ids() -> None:
    s = PrecisionSession.model_validate(
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "programId": {"id": "3c9bbe08-5084-4da2-9738-3ab30c3096d2"},
            "planId": {"id": "6c6a3746-9733-469a-9e4e-5ba8e203c085"},
            "tableType": {"id": "eight_ft"},
            "status": "completed",
        }
    )
    assert s.program_id == "3c9bbe08-5084-4da2-9738-3ab30c3096d2"
    assert s.plan_id == "6c6a3746-9733-469a-9e4e-5ba8e203c085"
    assert s.table_type == TableType.EIGHT_FT
    assert s.status == PrecisionSessionStatus.COMPLETED


def test_legacy_program_plan_object_keys() -> None:
    """Some exports nest refs under ``program`` / ``plan`` instead of programId/planId."""
    s = PrecisionSession.model_validate(
        {
            "id": "550e8400-e29b-41d4-a716-446655440002",
            "program": {"id": "3c9bbe08-5084-4da2-9738-3ab30c3096d2"},
            "plan": {"id": "6c6a3746-9733-469a-9e4e-5ba8e203c085"},
            "tableType": "nine_ft",
            "status": "in_progress",
        }
    )
    assert s.program_id == "3c9bbe08-5084-4da2-9738-3ab30c3096d2"
    assert s.plan_id == "6c6a3746-9733-469a-9e4e-5ba8e203c085"


def test_legacy_table_object_key() -> None:
    s = PrecisionSession.model_validate(
        {
            "id": "550e8400-e29b-41d4-a716-446655440003",
            "programId": "3c9bbe08-5084-4da2-9738-3ab30c3096d2",
            "planId": "6c6a3746-9733-469a-9e4e-5ba8e203c085",
            "table": {"id": "eight_ft"},
        }
    )
    assert s.table_type == TableType.EIGHT_FT


def test_flat_strings_unchanged() -> None:
    s = PrecisionSession.model_validate(
        {
            "id": "550e8400-e29b-41d4-a716-446655440001",
            "programId": "3c9bbe08-5084-4da2-9738-3ab30c3096d2",
            "planId": "6c6a3746-9733-469a-9e4e-5ba8e203c085",
            "tableType": "nine_ft",
        }
    )
    assert s.program_id == "3c9bbe08-5084-4da2-9738-3ab30c3096d2"
    assert s.table_type == TableType.NINE_FT
