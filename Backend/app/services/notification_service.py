from __future__ import annotations

import html
import os
import smtplib
import ssl
from email.message import EmailMessage
from typing import Any, Dict, List

import httpx


def _env_enabled(name: str, default: bool = False) -> bool:
    fallback = "true" if default else "false"

    return (
        os.getenv(name, fallback)
        .strip()
        .lower()
        in {"1", "true", "yes", "on"}
    )


def _mask_email(value: str) -> str:
    if "@" not in value:
        return "***"

    name, domain = value.split("@", 1)

    if len(name) <= 2:
        hidden_name = name[:1] + "*"
    else:
        hidden_name = name[:2] + "*" * max(2, len(name) - 2)

    return f"{hidden_name}@{domain}"


def _mask_phone(value: str) -> str:
    clean = value.strip()

    if len(clean) <= 4:
        return "****"

    return f"{clean[:3]}******{clean[-3:]}"


def get_demo_recipients(audience: str) -> List[Dict[str, str]]:
    available = {
        "authority": {
            "role": os.getenv(
                "ALERT_AUTHORITY_NAME",
                "Authority Demo Recipient",
            ),
            "email": os.getenv(
                "ALERT_AUTHORITY_EMAIL",
                "",
            ).strip(),
            "phone": os.getenv(
                "ALERT_AUTHORITY_PHONE",
                "",
            ).strip(),
        },
        "public": {
            "role": os.getenv(
                "ALERT_PUBLIC_NAME",
                "General Public Demo Recipient",
            ),
            "email": os.getenv(
                "ALERT_PUBLIC_EMAIL",
                "",
            ).strip(),
            "phone": os.getenv(
                "ALERT_PUBLIC_PHONE",
                "",
            ).strip(),
        },
    }

    if audience == "authority":
        return [available["authority"]]

    if audience == "public":
        return [available["public"]]

    return [
        available["authority"],
        available["public"],
    ]


def send_email_alert(
    *,
    recipients: List[Dict[str, str]],
    subject: str,
    plain_text: str,
    html_content: str,
) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []

    if not _env_enabled("REAL_EMAIL_ENABLED"):
        for recipient in recipients:
            results.append({
                "channel": "email",
                "recipient_role": recipient["role"],
                "recipient": _mask_email(
                    recipient.get("email", "")
                ),
                "success": False,
                "provider_id": None,
                "error": "REAL_EMAIL_ENABLED is false",
            })

        return results

    sender_email = os.getenv(
        "GMAIL_SMTP_EMAIL",
        "",
    ).strip()

    app_password = os.getenv(
        "GMAIL_APP_PASSWORD",
        "",
    ).replace(" ", "").strip()

    if not sender_email or not app_password:
        for recipient in recipients:
            results.append({
                "channel": "email",
                "recipient_role": recipient["role"],
                "recipient": _mask_email(
                    recipient.get("email", "")
                ),
                "success": False,
                "provider_id": None,
                "error": (
                    "GMAIL_SMTP_EMAIL or "
                    "GMAIL_APP_PASSWORD is missing"
                ),
            })

        return results

    context = ssl.create_default_context()

    for recipient in recipients:
        email_address = recipient.get("email", "").strip()
        role = recipient["role"]

        if not email_address:
            results.append({
                "channel": "email",
                "recipient_role": role,
                "recipient": "not-configured",
                "success": False,
                "provider_id": None,
                "error": f"Email is not configured for {role}",
            })
            continue

        try:
            message = EmailMessage()

            message["From"] = (
                f"Rakshak Demo Alerts <{sender_email}>"
            )
            message["To"] = email_address
            message["Subject"] = subject

            message.set_content(plain_text)

            message.add_alternative(
                html_content,
                subtype="html",
            )

            with smtplib.SMTP(
                "smtp.gmail.com",
                587,
                timeout=20,
            ) as smtp:
                smtp.ehlo()
                smtp.starttls(context=context)
                smtp.ehlo()

                smtp.login(
                    sender_email,
                    app_password,
                )

                smtp.send_message(message)

            results.append({
                "channel": "email",
                "recipient_role": role,
                "recipient": _mask_email(email_address),
                "success": True,
                "provider_id": "gmail-smtp-accepted",
                "error": None,
            })

        except Exception as exc:
            results.append({
                "channel": "email",
                "recipient_role": role,
                "recipient": _mask_email(email_address),
                "success": False,
                "provider_id": None,
                "error": str(exc),
            })

    return results


def send_sms_alert(
    *,
    recipients: List[Dict[str, str]],
    message: str,
) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []

    if not _env_enabled("REAL_SMS_ENABLED"):
        for recipient in recipients:
            results.append({
                "channel": "sms",
                "recipient_role": recipient["role"],
                "recipient": _mask_phone(
                    recipient.get("phone", "")
                ),
                "success": False,
                "provider_id": None,
                "error": "REAL_SMS_ENABLED is false",
            })

        return results

    account_sid = os.getenv(
        "TWILIO_ACCOUNT_SID",
        "",
    ).strip()

    auth_token = os.getenv(
        "TWILIO_AUTH_TOKEN",
        "",
    ).strip()

    from_number = os.getenv(
        "TWILIO_FROM_NUMBER",
        "",
    ).strip()

    if not account_sid or not auth_token or not from_number:
        for recipient in recipients:
            results.append({
                "channel": "sms",
                "recipient_role": recipient["role"],
                "recipient": _mask_phone(
                    recipient.get("phone", "")
                ),
                "success": False,
                "provider_id": None,
                "error": "Twilio configuration is incomplete",
            })

        return results

    endpoint = (
        "https://api.twilio.com/2010-04-01/"
        f"Accounts/{account_sid}/Messages.json"
    )

    # Keep demo SMS concise.
    sms_body = message[:450]

    with httpx.Client(timeout=20.0) as client:
        for recipient in recipients:
            phone = recipient.get("phone", "").strip()
            role = recipient["role"]

            if not phone:
                results.append({
                    "channel": "sms",
                    "recipient_role": role,
                    "recipient": "not-configured",
                    "success": False,
                    "provider_id": None,
                    "error": f"Phone is not configured for {role}",
                })
                continue

            try:
                response = client.post(
                    endpoint,
                    data={
                        "Body": sms_body,
                        "From": from_number,
                        "To": phone,
                    },
                    auth=(
                        account_sid,
                        auth_token,
                    ),
                )

                response.raise_for_status()
                payload = response.json()

                results.append({
                    "channel": "sms",
                    "recipient_role": role,
                    "recipient": _mask_phone(phone),
                    "success": True,
                    "provider_id": payload.get("sid"),
                    "error": None,
                })

            except Exception as exc:
                results.append({
                    "channel": "sms",
                    "recipient_role": role,
                    "recipient": _mask_phone(phone),
                    "success": False,
                    "provider_id": None,
                    "error": str(exc),
                })

    return results


def build_alert_email_html(
    *,
    alert_id: str,
    region: str,
    severity: str,
    alert_message: str,
) -> str:
    safe_region = html.escape(region)
    safe_severity = html.escape(severity.upper())
    safe_message = html.escape(alert_message)
    safe_alert_id = html.escape(alert_id)

    severity_colour = {
        "low": "#22c55e",
        "medium": "#f59e0b",
        "high": "#f97316",
        "critical": "#ef4444",
    }.get(severity.lower(), "#f59e0b")

    return f"""
    <div style="
        max-width:640px;
        margin:auto;
        background:#031a12;
        color:#f4fff7;
        padding:28px;
        border-radius:18px;
        font-family:Arial,sans-serif;
    ">
        <div style="
            color:#f59e0b;
            font-weight:700;
            font-size:13px;
            letter-spacing:0.08em;
        ">
            PRESENTATION DEMONSTRATION ONLY
        </div>

        <h1 style="
            margin:12px 0;
            color:#22c55e;
        ">
            Rakshak Environmental Alert
        </h1>

        <div style="
            border-left:5px solid {severity_colour};
            background:#0d3524;
            padding:18px;
            border-radius:10px;
        ">
            <p><strong>Alert ID:</strong> {safe_alert_id}</p>
            <p><strong>Region:</strong> {safe_region}</p>
            <p>
                <strong>Risk level:</strong>
                <span style="color:{severity_colour};">
                    {safe_severity}
                </span>
            </p>
            <p><strong>Message:</strong> {safe_message}</p>
        </div>

        <p style="
            margin-top:20px;
            color:#c3d8ca;
            line-height:1.6;
        ">
            This message demonstrates Rakshak's real alert-delivery
            workflow. It is not an official government warning.
            Check official government advisories before taking action.
        </p>
    </div>
    """