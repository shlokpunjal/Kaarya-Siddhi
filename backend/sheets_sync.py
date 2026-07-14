import gspread
from google.oauth2.service_account import Credentials
from datetime import datetime
import os

from supabase_client import supabase

SPREADSHEET_ID = "1wJyLPY7iCNjj83T01c_UlkcVecTahMLZHGs7LgA9wBk"
SHEET_TAB_NAME = "Sheet1"

WORKSPACE_ID = "342fd7c8-3cdd-4de5-be8a-fb42dd86dcca"
CREATED_BY = "fae2401d-735e-4308-8faf-f3aa045bdbf2"

STATUS_MAP = {
    "pending": "pending",
    "completed": "completed",
}

SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]


def get_sheet_client():
    creds_path = os.path.join(os.path.dirname(__file__), "service_account.json")
    creds = Credentials.from_service_account_file(creds_path, scopes=SCOPES)
    return gspread.authorize(creds)


def parse_deadline(raw_value: str):
    """Handles both DD-MM-YYYY and DD/MM/YYYY sheet date formats."""
    if not raw_value or not raw_value.strip():
        return None

    raw_value = raw_value.strip()

    for fmt in ("%d-%m-%Y", "%d/%m/%Y"):
        try:
            parsed = datetime.strptime(raw_value, fmt)
            return parsed.isoformat()
        except ValueError:
            continue

    print(f"Could not parse deadline value: '{raw_value}'")
    return None


def normalize_status(raw_status: str):
    if not raw_status:
        return "pending"
    return STATUS_MAP.get(raw_status.strip().lower(), "pending")


def sync_tasks_from_sheet():
    """
    Reads all rows from the Google Sheet and upserts them into the
    tasks table, matched by (workspace_id, sheet_row_id) so re-running
    this never creates duplicates.
    """
    try:
        client = get_sheet_client()
        sheet = client.open_by_key(SPREADSHEET_ID).worksheet(SHEET_TAB_NAME)
        rows = sheet.get_all_records()
    except Exception as e:
        print(f"Sheet sync failed to read sheet: {e}")
        return {"success": False, "error": str(e)}

    synced = 0
    skipped = 0
    unmatched_names = []

    for row in rows:
        sr_no = row.get("sr.no")
        task_title = (row.get("Task") or "").strip()

        if not sr_no or not task_title:
            skipped += 1
            continue

        try:
            sheet_row_id = int(sr_no)
        except (ValueError, TypeError):
            skipped += 1
            continue

        assigned_to_name = (row.get("Assigned to ") or row.get("Assigned to") or "").strip() or None
        remark = (row.get("Remark") or "").strip() or None
        deadline_raw = row.get("Completion(expected)") or ""
        status_raw = row.get("Status") or ""

        assigned_to = None
        if assigned_to_name:
            assigned_to = get_employee_id_by_name(assigned_to_name, WORKSPACE_ID)
            if assigned_to is None:
                # Name was given but didn't match any employee — flag it,
                # but still create the task as unassigned rather than dropping it
                unmatched_names.append({
                    "row": sheet_row_id,
                    "task": task_title,
                    "name_in_sheet": assigned_to_name,
                })

        task_payload = {
            "workspace_id": WORKSPACE_ID,
            "sheet_row_id": sheet_row_id,
            "title": task_title,
            "description": remark,
            "assigned_to": assigned_to,
            "deadline": parse_deadline(str(deadline_raw)),
            "status": normalize_status(str(status_raw)),
            "created_by": CREATED_BY,
            "source": "sheet",
        }

        existing = (
            supabase.table("tasks")
            .select("id")
            .eq("workspace_id", WORKSPACE_ID)
            .eq("sheet_row_id", sheet_row_id)
            .execute()
        )

        if existing.data:
            supabase.table("tasks").update(task_payload).eq(
                "id", existing.data[0]["id"]
            ).execute()
        else:
            supabase.table("tasks").insert(task_payload).execute()

        synced += 1

    if unmatched_names:
        print(f"Sheet sync: {len(unmatched_names)} row(s) had unmatched employee names:")
        for item in unmatched_names:
            print(f"  Row {item['row']} ('{item['task']}'): '{item['name_in_sheet']}' not found")

    print(f"Sheet sync complete: {synced} synced, {skipped} skipped, {len(unmatched_names)} unmatched names")

    return {
        "success": True,
        "synced": synced,
        "skipped": skipped,
        "unmatched_names": unmatched_names,
    }

def get_employee_id_by_name(name: str, workspace_id: str):
    """Looks up a user's id by name, scoped to employees in this workspace."""
    if not name:
        return None

    result = (
        supabase.table("users")
        .select("id")
        .ilike("name", name.strip())
        .eq("role", "employee")
        .eq("workspace_id", workspace_id)
        .execute()
    )

    if result.data:
        return result.data[0]["id"]

    print(f"Warning: no employee found matching name '{name}' in workspace {workspace_id}")
    return None