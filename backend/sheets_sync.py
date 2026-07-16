import gspread
from google.oauth2.service_account import Credentials
from datetime import datetime
import os

from supabase_client import supabase

from gspread.utils import ValidationConditionType


SPREADSHEET_ID = "1wJyLPY7iCNjj83T01c_UlkcVecTahMLZHGs7LgA9wBk"
SHEET_TAB_NAME = "Sheet1"

WORKSPACE_ID = "342fd7c8-3cdd-4de5-be8a-fb42dd86dcca"
CREATED_BY = "fae2401d-735e-4308-8faf-f3aa045bdbf2"

STATUS_MAP = {
    "pending": "pending",
    "completed": "completed",
}

# NOTE: full read/write scope now required for two-way sync (row deletion).
# The service account must also have Editor access on the actual Sheet.
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]


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


def delete_row_from_sheet(sheet, sr_no: int):
    """
    Finds the actual row in the live Sheet whose 'sr.no' column matches
    sr_no, and deletes that row. Returns True if a row was found and deleted.
    """
    try:
        cell = sheet.find(str(sr_no), in_column=1)
    except gspread.exceptions.CellNotFound:
        return False

    if cell is None:
        return False

    sheet.delete_rows(cell.row)
    return True


def sync_tasks_from_sheet():
    
    try:
        client = get_sheet_client()
        sheet = client.open_by_key(SPREADSHEET_ID).worksheet(SHEET_TAB_NAME)
        update_employee_dropdown(sheet)  # <-- add this line
        rows = sheet.get_all_records()
    except Exception as e:
        print(f"Sheet sync failed to read sheet: {e}")
        return {"success": False, "error": str(e)}
    
    
    """
    Full two-way sync between the Google Sheet and the tasks table:
      - New rows in the Sheet -> create tasks
      - Changed rows in the Sheet -> update tasks
      - Rows removed from the Sheet -> delete the matching task
      - Tasks deleted in the app (that came from the Sheet) -> delete the
        matching row from the Sheet
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
    deleted_from_app = 0
    deleted_from_sheet = 0

    # --- Build the current state of the Sheet: sheet_row_id -> row data ---
    sheet_rows_by_id = {}
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

        sheet_rows_by_id[sheet_row_id] = row

    # --- Load our tracking table: every sheet_row_id we've ever synced ---
    tracked = (
        supabase.table("synced_sheet_tasks")
        .select("id, sheet_row_id, task_id")
        .eq("workspace_id", WORKSPACE_ID)
        .execute()
    )
    tracked_by_row_id = {t["sheet_row_id"]: t for t in tracked.data}

    # --- Pass 1: process every row currently in the Sheet ---
    for sheet_row_id, row in sheet_rows_by_id.items():
        task_title = (row.get("Task") or "").strip()
        assigned_to_name = (row.get("Assigned to ") or row.get("Assigned to") or "").strip() or None
        remark = (row.get("Remark") or "").strip() or None
        deadline_raw = row.get("Completion(expected)") or ""
        status_raw = row.get("Status") or ""

        assigned_to = None
        if assigned_to_name:
            assigned_to = get_employee_id_by_name(assigned_to_name, WORKSPACE_ID)
            if assigned_to is None:
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

        tracking_entry = tracked_by_row_id.get(sheet_row_id)

        if tracking_entry is None:
            # Brand new row -- never synced before. Create the task.
            inserted = supabase.table("tasks").insert(task_payload).execute()
            new_task_id = inserted.data[0]["id"] if inserted.data else None

            supabase.table("synced_sheet_tasks").insert({
                "workspace_id": WORKSPACE_ID,
                "sheet_row_id": sheet_row_id,
                "task_id": new_task_id,
            }).execute()

            synced += 1
            continue

        # We've seen this row before -- check whether the task still exists
        existing_task = None
        if tracking_entry["task_id"]:
            existing_task = (
                supabase.table("tasks")
                .select("id")
                .eq("id", tracking_entry["task_id"])
                .execute()
            )

        task_still_exists = bool(existing_task and existing_task.data)

        if task_still_exists:
            # Normal case -- update it with whatever's currently in the Sheet
            supabase.table("tasks").update(task_payload).eq(
                "id", tracking_entry["task_id"]
            ).execute()
            synced += 1
        else:
            # The task was deleted in the app -- propagate that deletion
            # back to the Sheet instead of recreating it.
            deleted = delete_row_from_sheet(sheet, sheet_row_id)
            if deleted:
                deleted_from_sheet += 1
            supabase.table("synced_sheet_tasks").delete().eq(
                "id", tracking_entry["id"]
            ).execute()
            # Remove from our in-memory map so pass 2 doesn't re-process it
            del tracked_by_row_id[sheet_row_id]

    # --- Pass 2: anything still tracked but no longer in the Sheet means
    #     the row was deleted from the Sheet -> delete the task in the app ---
    for sheet_row_id, tracking_entry in list(tracked_by_row_id.items()):
        if sheet_row_id in sheet_rows_by_id:
            continue  # still present, already handled above

        if tracking_entry["task_id"]:
            supabase.table("tasks").delete().eq(
                "id", tracking_entry["task_id"]
            ).execute()
            deleted_from_app += 1

        supabase.table("synced_sheet_tasks").delete().eq(
            "id", tracking_entry["id"]
        ).execute()

    if unmatched_names:
        print(f"Sheet sync: {len(unmatched_names)} row(s) had unmatched employee names:")
        for item in unmatched_names:
            print(f"  Row {item['row']} ('{item['task']}'): '{item['name_in_sheet']}' not found")

    print(
        f"Sheet sync complete: {synced} synced, {skipped} skipped, "
        f"{len(unmatched_names)} unmatched names, "
        f"{deleted_from_app} deleted from app, {deleted_from_sheet} deleted from sheet"
    )

    return {
        "success": True,
        "synced": synced,
        "skipped": skipped,
        "unmatched_names": unmatched_names,
        "deleted_from_app": deleted_from_app,
        "deleted_from_sheet": deleted_from_sheet,
    }

def update_employee_dropdown(sheet):
    """
    Refreshes the list of valid employee names in a hidden helper column,
    and applies dropdown validation to the 'Assigned to' column so typing
    an unknown name shows Google Sheets' built-in warning indicator.
    """
    employees = (
        supabase.table("users")
        .select("name")
        .eq("role", "employee")
        .eq("workspace_id", WORKSPACE_ID)
        .order("name")
        .execute()
    )

    names = [e["name"] for e in employees.data]

    if not names:
        return

    # Write the valid names into a helper column (Z), starting at Z2
    helper_range = f"Z2:Z{len(names) + 1}"
    sheet.update(helper_range, [[name] for name in names])

    # Apply dropdown validation to the "Assigned to" column (column C),
    # rows 2 through 500 (adjust if you expect more rows)
    sheet.add_validation(
        "C2:C500",
        "ONE_OF_RANGE",
        [f"=$Z$2:$Z${len(names) + 1}"],
        showCustomUi=True,
    )