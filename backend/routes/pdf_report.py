from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.platypus.flowables import HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.graphics.shapes import Drawing, Wedge, String
from reportlab.graphics import renderPDF
from mock_data import mock_tasks
import math

router = APIRouter()

NAVY = colors.HexColor("#0B1B3D")
SAFFRON = colors.HexColor("#E8870A")
LIGHT_GREY = colors.HexColor("#F4F6FA")
BORDER = colors.HexColor("#E2E2E6")
WHITE = colors.white

STATUS_COLORS = {
    "overdue": colors.HexColor("#C53030"),
    "pending": colors.HexColor("#DD6B20"),
    "inReview": colors.HexColor("#2B6CB0"),
    "completed": colors.HexColor("#2D6A4F"),
}

@router.get("/reports/tasks/pdf")
def generate_pdf_report(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
):
    tasks = mock_tasks

    if start_date:
        tasks = [t for t in tasks if t["dueDate"] >= start_date]
    if end_date:
        tasks = [t for t in tasks if t["dueDate"] <= end_date]

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
    "title", fontName="Helvetica-Bold", fontSize=18,
    textColor=NAVY, spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
    "subtitle", fontName="Helvetica", fontSize=10,
    textColor=colors.HexColor("#6E717A"), spaceAfter=6
    )
    date_style = ParagraphStyle(
    "date", fontName="Helvetica", fontSize=9,
    textColor=colors.HexColor("#6E717A"), spaceAfter=12
    )
    section_style = ParagraphStyle(
        "section", fontName="Helvetica-Bold", fontSize=14,
        textColor=NAVY, spaceAfter=10
    )

    elements = []

    # --- PAGE 1: Header ---
    elements.append(Paragraph("Kaarya Siddhi — Task Report", title_style))
    elements.append(Spacer(1, 4*mm))
    elements.append(Paragraph("Central Railway, Solapur Division", subtitle_style))
    elements.append(Paragraph(
        f"Period: {start_date or 'All'} to {end_date or 'All'} &nbsp;&nbsp;|&nbsp;&nbsp; Total Tasks: {len(tasks)}",
        date_style
    ))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=12))

    # --- PAGE 1: Table ---
    headers = ["Task ID", "Title", "Assigned To", "Status", "Priority", "Label", "Due Date"]
    col_widths = [18*mm, 52*mm, 32*mm, 22*mm, 20*mm, 24*mm, 22*mm]

    table_data = [headers]
    for task in tasks:
        table_data.append([
            task["id"],
            task["title"],
            task["assignedToName"],
            task["status"],
            task["priority"],
            task["label"],
            task["dueDate"],
        ])

    table = Table(table_data, colWidths=col_widths, repeatRows=1)

    table_style = [
        # Header
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUND", (0, 1), (-1, -1), [WHITE, LIGHT_GREY]),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("ROWHEIGHT", (0, 0), (-1, -1), 9*mm),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]

    # Color status column
    for i, task in enumerate(tasks, start=1):
        status_color = STATUS_COLORS.get(task["status"], colors.black)
        table_style.append(("TEXTCOLOR", (3, i), (3, i), status_color))
        table_style.append(("FONTNAME", (3, i), (3, i), "Helvetica-Bold"))

    table.setStyle(TableStyle(table_style))
    elements.append(table)

    # --- PAGE 2: Pie Chart ---
    elements.append(PageBreak())
    elements.append(Paragraph("Task Status Overview", section_style))
    elements.append(Paragraph(
        f"Breakdown of {len(tasks)} tasks by current status",
        subtitle_style
    ))
    elements.append(Spacer(1, 10*mm))

    # Count statuses
    status_counts = {}
    for task in tasks:
        s = task["status"]
        status_counts[s] = status_counts.get(s, 0) + 1

    total = len(tasks)
    pie_colors = {
        "overdue": colors.HexColor("#C53030"),
        "pending": colors.HexColor("#DD6B20"),
        "inReview": colors.HexColor("#2B6CB0"),
        "completed": colors.HexColor("#2D6A4F"),
    }

    # Draw pie chart manually using Wedge
    drawing = Drawing(400, 250)
    cx, cy, radius = 130, 125, 100
    start_angle = 90

    for status, count in status_counts.items():
        angle = (count / total) * 360
        wedge = Wedge(cx, cy, radius, start_angle, start_angle - angle)
        wedge.fillColor = pie_colors.get(status, colors.grey)
        wedge.strokeColor = WHITE
        wedge.strokeWidth = 1
        drawing.add(wedge)
        start_angle -= angle

    # Legend
    legend_x = 280
    legend_y = 200
    for status, count in status_counts.items():
        percent = (count / total) * 100
        from reportlab.graphics.shapes import Rect
        rect = Rect(legend_x, legend_y, 12, 12)
        rect.fillColor = pie_colors.get(status, colors.grey)
        rect.strokeColor = None
        drawing.add(rect)
        label = String(
            legend_x + 18, legend_y + 2,
            f"{status}: {count} ({percent:.1f}%)",
            fontName="Helvetica", fontSize=10,
            fillColor=colors.HexColor("#1A1A1E")
        )
        drawing.add(label)
        legend_y -= 24

    elements.append(drawing)

    doc.build(elements)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=task_report.pdf"},
    )