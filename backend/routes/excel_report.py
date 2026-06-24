from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from io import BytesIO
from mock_data import mock_tasks

router = APIRouter()

@router.get("/reports/tasks/excel")
def generate_task_report(
    employee_id: str | None = Query(None),
    status: str | None = Query(None),
    priority: str | None = Query(None),
    label: str | None = Query(None),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
):
    
    tasks = mock_tasks

    if employee_id:
        tasks = [t for t in tasks if t["assignedTo"] == employee_id]
    if status:
        tasks = [t for t in tasks if t["status"] == status]
    if priority:
        tasks = [t for t in tasks if t["priority"] == priority]
    if label:
        tasks = [t for t in tasks if label.lower() in t["label"].lower()]
    if start_date:
        tasks = [t for t in tasks if t["dueDate"] >= start_date]
    if end_date:
        tasks = [t for t in tasks if t["dueDate"] <= end_date]

    wb = Workbook()
    sheet = wb.active
    sheet.title = "Task Report"

    # Brand colors, matching theme.ts (lightTheme.colors.brand)
    NAVY = "0B1B3D"
    SAFFRON = "E06A28"

    headers = ["Task ID", "Title", "Assigned To", "Status", "Priority", "Label", "Due Date"]
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

    for row_idx, task in enumerate(tasks, start=2):
        row_values = [
            task["id"], task["title"], task["assignedToName"],
            task["status"], task["priority"], task["label"], task["dueDate"],
        ]
        sheet.append(row_values)
        for col_idx in range(1, len(headers) + 1):
            cell = sheet.cell(row=row_idx, column=col_idx)
            cell.border = cell_border
            cell.alignment = Alignment(vertical="center")
            if row_idx % 2 == 0:
                cell.fill = PatternFill(start_color="F4F6FA", end_color="F4F6FA", fill_type="solid")

    last_row = sheet.max_row
    last_col_letter = sheet.cell(row=1, column=len(headers)).column_letter
    table_range = f"A1:{last_col_letter}{max(last_row, 1)}"

    table = Table(displayName="TaskTable", ref=table_range)
    table.tableStyleInfo = TableStyleInfo(
        name="TableStyleMedium2", showRowStripes=False  # we're hand-striping above, so library stripes off
    )
    sheet.add_table(table)

    column_widths = [10, 28, 18, 14, 12, 16, 14]
    for col_idx, width in enumerate(column_widths, start=1):
        sheet.column_dimensions[sheet.cell(row=1, column=col_idx).column_letter].width = width

    sheet.freeze_panes = "A2"  # header row stays visible while scrolling

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=task_report.xlsx"},
    )