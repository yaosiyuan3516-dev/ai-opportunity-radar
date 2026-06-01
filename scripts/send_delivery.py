from __future__ import annotations

import argparse
import os
import smtplib
from email.message import EmailMessage
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DELIVERABLES = ROOT / "deliverables"

TIERS = {
    "starter": {
        "name": "AI Opportunity Radar Starter Report",
        "file": DELIVERABLES / "starter-report.pdf",
    },
    "pro": {
        "name": "AI Opportunity Radar Weekly Pro",
        "file": DELIVERABLES / "weekly-pro-report.pdf",
    },
    "sponsor": {
        "name": "AI Opportunity Radar Sponsor Kit",
        "file": DELIVERABLES / "sponsor-kit.pdf",
    },
}


def build_message(to_email: str, tier: str, transaction_id: str, from_email: str) -> EmailMessage:
    item = TIERS[tier]
    attachment = item["file"]
    if not attachment.exists():
        raise FileNotFoundError(f"Missing deliverable: {attachment}")

    msg = EmailMessage()
    msg["From"] = from_email
    msg["To"] = to_email
    msg["Subject"] = f"Your {item['name']}"
    msg.set_content(
        f"""Hi,

Thanks for your purchase.

Your {item['name']} is attached to this email.

Transaction ID: {transaction_id}

Please note: this is a digital research product based on public sources. It is not financial, legal, tax, employment, or income advice. Digital content sales are final after access is delivered.

Best,
AI Opportunity Radar
"""
    )

    msg.add_attachment(
        attachment.read_bytes(),
        maintype="application",
        subtype="pdf",
        filename=attachment.name,
    )
    return msg


def send(msg: EmailMessage) -> None:
    host = os.environ["DELIVERY_SMTP_HOST"]
    port = int(os.environ.get("DELIVERY_SMTP_PORT", "587"))
    user = os.environ["DELIVERY_SMTP_USER"]
    password = os.environ["DELIVERY_SMTP_PASS"]

    with smtplib.SMTP(host, port) as smtp:
        smtp.starttls()
        smtp.login(user, password)
        smtp.send_message(msg)


def main() -> None:
    parser = argparse.ArgumentParser(description="Send AI Opportunity Radar paid deliverable.")
    parser.add_argument("--tier", choices=sorted(TIERS), required=True)
    parser.add_argument("--to", required=True, help="Buyer email address")
    parser.add_argument("--transaction", required=True, help="PayPal transaction ID")
    parser.add_argument("--dry-run", action="store_true", help="Build email without sending")
    args = parser.parse_args()

    from_email = os.environ.get("DELIVERY_FROM_EMAIL", "AI Opportunity Radar <no-reply@example.com>")
    msg = build_message(args.to, args.tier, args.transaction, from_email)
    if args.dry_run:
        item = TIERS[args.tier]
        print(f"From: {from_email}")
        print(f"To: {args.to}")
        print(f"Subject: Your {item['name']}")
        print(f"Attachment: {item['file']}")
        print()
        print(msg.get_body(preferencelist=("plain",)).get_content())
        return
    send(msg)
    print(f"Sent {args.tier} deliverable to {args.to}")


if __name__ == "__main__":
    main()
