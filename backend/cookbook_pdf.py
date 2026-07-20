"""Family Cookbook PDF generator — warm earthen layout."""
from io import BytesIO
from typing import List, Dict, Any
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether,
    Table, TableStyle, Flowable,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT


# Earthen palette (matches the app)
TERRACOTTA = colors.HexColor("#D96C4A")
SAND = colors.HexColor("#F6F3EB")
INK = colors.HexColor("#2C302B")
MUTED = colors.HexColor("#5B6359")
SOFT = colors.HexColor("#8C857B")
GOLD = colors.HexColor("#D9A05B")
BG = colors.HexColor("#FDFBF7")


def _styles():
    return {
        "title": ParagraphStyle(
            "Title", fontName="Times-Bold", fontSize=44, leading=48,
            textColor=INK, alignment=TA_CENTER, spaceAfter=14,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle", fontName="Times-Italic", fontSize=14, leading=20,
            textColor=MUTED, alignment=TA_CENTER, spaceAfter=10,
        ),
        "kicker": ParagraphStyle(
            "Kicker", fontName="Helvetica-Bold", fontSize=8, leading=10,
            textColor=SOFT, alignment=TA_CENTER, spaceAfter=18,
        ),
        "recipe_kicker": ParagraphStyle(
            "RecipeKicker", fontName="Helvetica-Bold", fontSize=8, leading=10,
            textColor=SOFT, alignment=TA_LEFT, spaceAfter=4,
        ),
        "recipe_title": ParagraphStyle(
            "RecipeTitle", fontName="Times-Bold", fontSize=26, leading=30,
            textColor=INK, alignment=TA_LEFT, spaceAfter=8,
        ),
        "description": ParagraphStyle(
            "Description", fontName="Times-Italic", fontSize=12, leading=18,
            textColor=MUTED, alignment=TA_LEFT, spaceAfter=12,
        ),
        "meta": ParagraphStyle(
            "Meta", fontName="Helvetica", fontSize=9.5, leading=14,
            textColor=SOFT, alignment=TA_LEFT, spaceAfter=14,
        ),
        "section": ParagraphStyle(
            "Section", fontName="Times-Bold", fontSize=14, leading=18,
            textColor=TERRACOTTA, alignment=TA_LEFT, spaceAfter=6,
        ),
        "ingredient": ParagraphStyle(
            "Ingredient", fontName="Helvetica", fontSize=11, leading=16,
            textColor=INK, alignment=TA_LEFT, leftIndent=14, bulletIndent=2,
        ),
        "step_text": ParagraphStyle(
            "Step", fontName="Helvetica", fontSize=11, leading=17,
            textColor=INK, alignment=TA_LEFT, spaceAfter=10,
        ),
        "notes_label": ParagraphStyle(
            "NotesLabel", fontName="Helvetica-Bold", fontSize=10, leading=14,
            textColor=SOFT, alignment=TA_LEFT, spaceAfter=4,
        ),
        "notes_body": ParagraphStyle(
            "NotesBody", fontName="Times-Italic", fontSize=11, leading=16,
            textColor=MUTED, alignment=TA_LEFT, spaceAfter=4,
        ),
        "toc_item": ParagraphStyle(
            "TocItem", fontName="Helvetica", fontSize=11, leading=18,
            textColor=INK, alignment=TA_LEFT,
        ),
        "footer": ParagraphStyle(
            "Footer", fontName="Helvetica", fontSize=8, leading=10,
            textColor=SOFT, alignment=TA_CENTER,
        ),
    }


class HRule(Flowable):
    """Soft horizontal rule."""
    def __init__(self, width: float, color=SOFT, thickness: float = 0.6):
        super().__init__()
        self.width = width
        self.color = color
        self.thickness = thickness

    def wrap(self, _aw, _ah):
        return self.width, self.thickness

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        self.canv.line(0, 0, self.width, 0)


class CoverDecoration(Flowable):
    """Decorative cover element: a warm circle with 'fc' monogram."""
    def __init__(self, size: float = 1.4 * inch):
        super().__init__()
        self.size = size

    def wrap(self, _aw, _ah):
        return self.size, self.size

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFillColor(TERRACOTTA)
        c.circle(self.size / 2, self.size / 2, self.size / 2, stroke=0, fill=1)
        c.setFillColor(BG)
        c.setFont("Times-BoldItalic", self.size * 0.5)
        c.drawCentredString(self.size / 2, self.size * 0.32, "fc")
        c.restoreState()


def _format_date(iso: str) -> str:
    try:
        dt = datetime.fromisoformat(iso)
        return dt.strftime("%B %d, %Y")
    except Exception:
        return ""


def _on_page(canvas, doc):
    """Footer on every page except the cover."""
    if doc.page == 1:
        return
    canvas.saveState()
    canvas.setFillColor(SOFT)
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(LETTER[0] / 2, 0.5 * inch, f"— {doc.page} —")
    canvas.restoreState()


def build_cookbook_pdf(cookbook: Dict[str, Any], recipes: List[Dict[str, Any]]) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=LETTER,
        leftMargin=0.9 * inch, rightMargin=0.9 * inch,
        topMargin=0.9 * inch, bottomMargin=0.9 * inch,
        title=cookbook.get("name") or "Family Cookbook",
        author="Family Cookbook",
    )
    s = _styles()
    page_w = LETTER[0] - 1.8 * inch  # available width

    story: List[Any] = []

    # ===== Cover =====
    story.append(Spacer(1, 1.2 * inch))
    story.append(CoverDecoration(1.4 * inch))
    story.append(Spacer(1, 0.4 * inch))
    story.append(Paragraph("A FAMILY COOKBOOK", s["kicker"]))
    story.append(Paragraph(_escape(cookbook.get("name") or "Our Family Cookbook"), s["title"]))
    story.append(Paragraph("Recipes we keep, recipes we share, recipes we pass down.", s["subtitle"]))
    story.append(Spacer(1, 0.6 * inch))
    story.append(HRule(page_w * 0.4, color=GOLD, thickness=1.0))
    story.append(Spacer(1, 0.18 * inch))

    member_count = len(cookbook.get("members") or [])
    recipe_count = len(recipes)
    summary = (
        f"{recipe_count} {'recipe' if recipe_count == 1 else 'recipes'} · "
        f"{member_count} {'member' if member_count == 1 else 'members'} · "
        f"compiled {datetime.now(timezone.utc).strftime('%B %Y')}"
    )
    story.append(Paragraph(summary, s["kicker"]))
    story.append(PageBreak())

    # ===== Table of contents =====
    if recipes:
        story.append(Paragraph("CONTENTS", s["recipe_kicker"]))
        story.append(Paragraph("In this book", s["recipe_title"]))
        story.append(Spacer(1, 0.18 * inch))
        for i, r in enumerate(recipes, 1):
            line = f"<font color='#D9A05B'><b>{i:02d}</b></font>&nbsp;&nbsp;{_escape(r.get('title') or 'Untitled')}"
            byline = r.get("created_by_name") or ""
            if byline:
                line += f"  <font color='#8C857B'><i>— from {_escape(byline)}</i></font>"
            story.append(Paragraph(line, s["toc_item"]))
        story.append(PageBreak())

    # ===== Recipes =====
    if not recipes:
        story.append(Spacer(1, 1.5 * inch))
        story.append(Paragraph("No recipes in this cookbook yet.", s["subtitle"]))
        story.append(Paragraph("Add the first one and reprint anytime.", s["kicker"]))
    else:
        for idx, r in enumerate(recipes):
            story.extend(_recipe_block(r, s, page_w, idx + 1))
            if idx < len(recipes) - 1:
                story.append(PageBreak())

    # Closing flourish
    story.append(Spacer(1, 0.4 * inch))
    story.append(HRule(page_w * 0.3, color=TERRACOTTA, thickness=1.2))
    story.append(Spacer(1, 0.18 * inch))
    story.append(Paragraph("With love, the family.", s["subtitle"]))

    doc.build(story, onFirstPage=lambda c, d: None, onLaterPages=_on_page)
    return buf.getvalue()


def _recipe_block(r: Dict[str, Any], s: Dict[str, ParagraphStyle], page_w: float, num: int) -> List[Any]:
    out: List[Any] = []
    contributor = r.get("created_by_name") or ""
    kicker = f"RECIPE {num:02d}"
    if contributor:
        kicker += f"  ·  FROM {contributor.upper()}"
    out.append(Paragraph(kicker, s["recipe_kicker"]))
    out.append(Paragraph(_escape(r.get("title") or "Untitled recipe"), s["recipe_title"]))

    if r.get("description"):
        out.append(Paragraph(_escape(r["description"]), s["description"]))

    meta_bits = []
    if r.get("prep_time"):
        meta_bits.append(f"<b>Prep</b>&nbsp; {_escape(r['prep_time'])}")
    if r.get("cook_time"):
        meta_bits.append(f"<b>Cook</b>&nbsp; {_escape(r['cook_time'])}")
    if r.get("servings"):
        meta_bits.append(f"<b>Serves</b>&nbsp; {_escape(r['servings'])}")
    if r.get("original_language"):
        meta_bits.append(f"<b>Recorded in</b>&nbsp; {_escape(r['original_language']).upper()}")
    if r.get("created_at"):
        date_str = _format_date(r["created_at"])
        if date_str:
            meta_bits.append(f"<b>Saved</b>&nbsp; {date_str}")
    if meta_bits:
        out.append(Paragraph("&nbsp;&nbsp;·&nbsp;&nbsp;".join(meta_bits), s["meta"]))

    out.append(HRule(page_w, color=SOFT, thickness=0.5))
    out.append(Spacer(1, 0.16 * inch))

    # Two-column: ingredients (left) | steps (right)
    ingredients = r.get("ingredients") or []
    ing_para_list: List[Any] = [Paragraph("Ingredients", s["section"])]
    if ingredients:
        for ing in ingredients:
            ing_para_list.append(Paragraph(f"• {_escape(str(ing))}", s["ingredient"]))
    else:
        ing_para_list.append(Paragraph("<i>—</i>", s["ingredient"]))

    steps = r.get("steps") or []
    step_para_list: List[Any] = [Paragraph("How to make it", s["section"])]
    if steps:
        for i, step in enumerate(steps, 1):
            text = step["text"] if isinstance(step, dict) else str(step)
            step_para_list.append(Paragraph(
                f"<font color='#D96C4A'><b>{i}.</b></font>&nbsp;&nbsp;{_escape(text)}",
                s["step_text"],
            ))
    else:
        step_para_list.append(Paragraph("<i>—</i>", s["step_text"]))

    col_w = (page_w - 0.3 * inch) / 2
    table = Table(
        [[ing_para_list, step_para_list]],
        colWidths=[col_w * 0.85, col_w * 1.15 + 0.3 * inch],
    )
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    out.append(table)

    if r.get("notes"):
        out.append(Spacer(1, 0.18 * inch))
        out.append(HRule(page_w * 0.4, color=GOLD, thickness=0.6))
        out.append(Spacer(1, 0.08 * inch))
        out.append(Paragraph("FAMILY NOTES", s["notes_label"]))
        out.append(Paragraph(_escape(r["notes"]), s["notes_body"]))

    return out


def _escape(text: str) -> str:
    """Escape XML-ish chars for ReportLab Paragraphs."""
    if text is None:
        return ""
    return (str(text)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;"))
