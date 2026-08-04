from fastapi import APIRouter, Query, Depends, HTTPException
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.chart import PieChart, Reference
from openpyxl.chart.label import DataLabelList
from openpyxl.chart.marker import DataPoint
from openpyxl.drawing.fill import PatternFillProperties, ColorChoice
from openpyxl.chart.shapes import GraphicalProperties
from io import BytesIO
from datetime import datetime

from auth_utils import get_current_user
from supabase_client import supabase

router = APIRouter()

# Same palette as pdf_report.py so both exports agree visually
STATUS_HEX = {
    "overdue": "C53030",
    "pending": "DD6B20",
    "inReview": "2B6CB0",
    "in_review": "2B6CB0",
    "completed": "2D6A4F",
}


def format_deadline(raw: str) -> str:
    """Turn '2026-07-17T00:00:00' into '2026-07-17' (no time/UTC component)."""
    if not raw:
        return "-"
    try:
        dt = datetime.fromisoformat(raw)
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        return raw


@router.get("/reports/tasks/excel")
def generate_task_report(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"), 
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    status: str | None = Query(None),
    priority: str | None = Query(None),
    employee_id: str | None = Query(None),
    user: dict = Depends(get_current_user),
):
    # Only admins can generate workspace-wide reports. Re-checked against
    # the DB rather than trusted from the JWT payload — role/workspace_id
    # claims in an access token can be up to ACCESS_TOKEN_MINUTES stale,
    # and a report export is exactly the kind of bulk-data action that
    # should reflect a role/workspace change immediately, not after the
    # old token expires. Matches the pattern already used in tasks.py.
    caller = (
        supabase.table("users")
        .select("role, workspace_id")
        .eq("email", user["sub"])
        .execute()
    )
    if not caller.data:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    caller_row = caller.data[0]

    if caller_row.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can generate task reports.")

    workspace_id = caller_row.get("workspace_id")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="No workspace associated with this account.")

    # Validate date format early with a clear error, rather than a confusing query failure later
    try:
        datetime.strptime(start_date, "%Y-%m-%d")
        datetime.strptime(end_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be in YYYY-MM-DD format.")

    query = (
        supabase.table("tasks")
        .select("*")
        .eq("workspace_id", workspace_id)
        .gte("deadline", start_date)
        .lte("deadline", end_date)
    )

    if status:
        query = query.eq("status", status)
    if priority:
        query = query.eq("priority", priority)
    if employee_id:
        query = query.eq("assigned_to", employee_id)

    result = query.execute()
    tasks = result.data or []

    if not tasks:
        raise HTTPException(
            status_code=404,
            detail="No tasks found for the given filters and date range.",
        )

    users_result = (
        supabase.table("users")
        .select("id, name")
        .eq("workspace_id", workspace_id)
        .execute()
    )
    user_name_map = {u["id"]: u["name"] for u in (users_result.data or [])}

    wb = Workbook()
    sheet = wb.active
    sheet.title = "Task Report"

    NAVY = "0B1B3D"

    # "Sr. No." instead of the raw UUID Task ID, "Task Name" instead of "Title"
    headers = ["Sr. No.", "Task Name", "Assigned To", "Status", "Priority", "Deadline"]
    sheet.append(headers)

    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color=NAVY, end_color=NAVY, fill_type="solid")
    header_alignment = Alignment(horizontal="center", vertical="center")
    cell_border = Border(
        left=Side(style="thin", color="57595C"),
        right=Side(style="thin", color="57595C"),
        top=Side(style="thin", color="57595C"),
        bottom=Side(style="thin", color="57595C"),
    )

    for col_idx, _ in enumerate(headers, start=1):
        cell = sheet.cell(row=1, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = cell_border

    sheet.row_dimensions[1].height = 26

    # Track status counts as we go, for the pie chart below
    status_counts = {}

    for row_idx, task in enumerate(tasks, start=2):
        sr_no = row_idx - 1
        task_status = task.get("status", "")
        status_counts[task_status] = status_counts.get(task_status, 0) + 1

        row_values = [
            sr_no,
            task.get("title", ""),
            user_name_map.get(task.get("assigned_to"), "Unassigned"),
            task_status,
            task.get("priority", ""),
            format_deadline(task.get("deadline")),
        ]
        sheet.append(row_values)
        for col_idx in range(1, len(headers) + 1):
            cell = sheet.cell(row=row_idx, column=col_idx)
            cell.border = cell_border
            cell.alignment = Alignment(vertical="center", horizontal="center" if col_idx == 1 else "left")
            if row_idx % 2 == 0:
                cell.fill = PatternFill(start_color="F4F6FA", end_color="F4F6FA", fill_type="solid")

    last_row = sheet.max_row
    last_col_letter = sheet.cell(row=1, column=len(headers)).column_letter
    table_range = f"A1:{last_col_letter}{max(last_row, 1)}"

    table = Table(displayName="TaskTable", ref=table_range)
    table.tableStyleInfo = TableStyleInfo(
        name="TableStyleMedium2", showRowStripes=False
    )
    sheet.add_table(table)

    column_widths = [10, 30, 22, 14, 12, 14]
    for col_idx, width in enumerate(column_widths, start=1):
        sheet.column_dimensions[sheet.cell(row=1, column=col_idx).column_letter].width = width

    sheet.freeze_panes = "A2"

    # --- Status breakdown data + pie chart (was completely missing before) ---
    # Write a small summary table a couple of columns past the task table,
    # since openpyxl charts need to reference real cells.
    summary_start_col = len(headers) + 2  # leave one blank column as a gutter
    summary_col_letter = sheet.cell(row=1, column=summary_start_col).column_letter
    count_col_letter = sheet.cell(row=1, column=summary_start_col + 1).column_letter

    sheet.cell(row=1, column=summary_start_col, value="Status")
    sheet.cell(row=1, column=summary_start_col + 1, value="Count")

    total = len(tasks)
    for i, (status_val, count) in enumerate(status_counts.items(), start=2):
        sheet.cell(row=i, column=summary_start_col, value=status_val)
        sheet.cell(row=i, column=summary_start_col + 1, value=count)

    summary_last_row = 1 + len(status_counts)

    chart = PieChart()
    chart.title = f"Task Status Overview — {total} tasks"
    chart.height = 9
    chart.width = 14

    data_ref = Reference(
        sheet, min_col=summary_start_col + 1, min_row=1,
        max_row=summary_last_row,
    )
    labels_ref = Reference(
        sheet, min_col=summary_start_col, min_row=2,
        max_row=summary_last_row,
    )
    chart.add_data(data_ref, titles_from_data=True)
    chart.set_categories(labels_ref)
    chart.dataLabels = DataLabelList()
    chart.dataLabels.showPercent = True
    chart.dataLabels.showCatName = True
    chart.dataLabels.showSerName = False
    chart.dataLabels.showVal = False
    chart.dataLabels.showLegendKey = False

    # Color each slice to match the same status palette used in the PDF report
    series = chart.series[0]
    points = []
    for status_val in status_counts.keys():
        hex_color = STATUS_HEX.get(status_val, "999999")
        pt = DataPoint(idx=len(points))
        pt.graphicalProperties = GraphicalProperties(solidFill=hex_color)
        points.append(pt)
    series.data_points = points

    sheet.add_chart(chart, f"{sheet.cell(row=summary_last_row + 2, column=summary_start_col).coordinate}")

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    filename = f"task_report_{start_date}_to_{end_date}.xlsx"

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )