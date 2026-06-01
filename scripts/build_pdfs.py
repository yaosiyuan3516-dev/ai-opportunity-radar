from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from textwrap import wrap

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "deliverables" / "weekly-pro-data.json"
OUT_DIR = ROOT / "deliverables"

DISCLAIMER = (
    "Small independent operation. Digital content sales are final and non-refundable "
    "after access is delivered. No investment, legal, tax, employment, or income "
    "guarantee is provided."
)


def load_payload() -> dict:
    with DATA_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)


def styles() -> dict:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=29,
            textColor=colors.HexColor("#18201c"),
            spaceAfter=12,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=colors.HexColor("#647067"),
            spaceAfter=14,
        ),
        "section": ParagraphStyle(
            "Section",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=19,
            textColor=colors.HexColor("#0b4f4a"),
            spaceBefore=10,
            spaceAfter=8,
        ),
        "item_title": ParagraphStyle(
            "ItemTitle",
            parent=base["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=11.5,
            leading=14,
            textColor=colors.HexColor("#18201c"),
            spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=12.5,
            textColor=colors.HexColor("#29322d"),
            spaceAfter=5,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=10,
            textColor=colors.HexColor("#647067"),
        ),
    }


def safe_text(value: object) -> str:
    text = str(value or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return text


def compact_url(url: str) -> str:
    if len(url) <= 88:
        return url
    parts = wrap(url, 88)
    return "<br/>".join(parts[:3])


def category_label(category: str) -> str:
    return {
        "远程工作": "Remote Jobs",
        "AI 工具": "AI Tools",
        "开源项目": "Open Source",
        "赚钱案例": "Monetization",
    }.get(category, category)


def header_story(title: str, price: str, count: int, generated_at: str) -> list:
    s = styles()
    date = datetime.fromisoformat(generated_at.replace("Z", "+00:00")).strftime("%b %d, %Y")
    return [
        Paragraph(title, s["title"]),
        Paragraph(
            f"{price} digital research deliverable - generated {date} - {count} source-linked signals.",
            s["subtitle"],
        ),
        Paragraph(
            "This product saves buyer research time by filtering public AI business signals into "
            "prioritized notes, monetization paths, and practical first actions. It does not promise "
            "income or any specific result.",
            s["body"],
        ),
        HRFlowable(width="100%", color=colors.HexColor("#d9d3c5"), thickness=1, spaceBefore=8, spaceAfter=10),
    ]


def item_block(item: dict, index: int) -> KeepTogether:
    s = styles()
    title = safe_text(item.get("title"))
    rows = [
        ["Category", safe_text(category_label(item.get("category", "")))],
        ["Score", safe_text(item.get("score", ""))],
        ["Monetize", safe_text(item.get("monetization", ""))],
        ["Next", safe_text(item.get("action", ""))],
        ["Source", safe_text(compact_url(item.get("url", "")))],
    ]
    table = Table(
        [[Paragraph(f"<b>{k}</b>", s["small"]), Paragraph(v, s["small"])] for k, v in rows],
        colWidths=[0.82 * inch, 5.7 * inch],
        hAlign="LEFT",
    )
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LINEBELOW", (0, 0), (-1, -2), 0.25, colors.HexColor("#e5dfd2")),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return KeepTogether(
        [
            Paragraph(f"{index}. {title}", s["item_title"]),
            Paragraph(safe_text(item.get("summary")), s["body"]),
            table,
            Spacer(1, 9),
        ]
    )


def final_note() -> list:
    s = styles()
    return [
        HRFlowable(width="100%", color=colors.HexColor("#d9d3c5"), thickness=1, spaceBefore=8, spaceAfter=8),
        Paragraph(DISCLAIMER, s["small"]),
    ]


def build_report(filename: str, title: str, price: str, items: list[dict]) -> None:
    s = styles()
    doc = SimpleDocTemplate(
        str(OUT_DIR / filename),
        pagesize=letter,
        rightMargin=0.55 * inch,
        leftMargin=0.55 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.55 * inch,
        title=title,
        author="AI Opportunity Radar",
    )
    story = header_story(title, price, len(items), payload["generatedAt"])
    story.append(Paragraph("Curated Signals", s["section"]))
    for index, item in enumerate(items, 1):
        story.append(item_block(item, index))
    story.extend(final_note())
    doc.build(story)


def build_sponsor_kit() -> None:
    s = styles()
    doc = SimpleDocTemplate(
        str(OUT_DIR / "sponsor-kit.pdf"),
        pagesize=letter,
        rightMargin=0.65 * inch,
        leftMargin=0.65 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.65 * inch,
        title="AI Opportunity Radar Sponsor Kit",
        author="AI Opportunity Radar",
    )
    story = [
        Paragraph("AI Opportunity Radar Sponsor Kit", s["title"]),
        Paragraph("$49 weekly sponsor slot for relevant AI tools, automation services, SaaS products, and founder-focused offers.", s["subtitle"]),
        Paragraph("Audience", s["section"]),
        Paragraph("Builders, solopreneurs, indie hackers, automation consultants, and AI tool buyers.", s["body"]),
        Paragraph("Placement", s["section"]),
        Paragraph("One sponsor mention in the weekly report or homepage sponsor section. Placement is subject to relevance and editorial fit.", s["body"]),
        Paragraph("What We Need From Sponsor", s["section"]),
        Paragraph("Product name, landing page URL, one-sentence description, target user, and any required disclosure.", s["body"]),
        Paragraph("Important Limits", s["section"]),
        Paragraph("Sponsor placement does not guarantee clicks, leads, sales, or any specific business outcome. Digital sponsorship sales are final after placement is accepted.", s["body"]),
    ]
    story.extend(final_note())
    doc.build(story)


if __name__ == "__main__":
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    payload = load_payload()
    items = payload["items"]
    build_report("starter-report.pdf", "AI Opportunity Radar Starter Report", "$4.99", items[:12])
    build_report("weekly-pro-report.pdf", "AI Opportunity Radar Weekly Pro", "$9.99", items)
    build_sponsor_kit()
    print("Generated deliverables/starter-report.pdf")
    print("Generated deliverables/weekly-pro-report.pdf")
    print("Generated deliverables/sponsor-kit.pdf")
