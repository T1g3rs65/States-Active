"""Send transactional email via AgentMail REST API.

Pattern from Open SaaS: on signup, email a verification link; the account is
"unverified" until the user clicks it. AgentMail is the sender (already
configured in this environment: AGENTMAIL_API_KEY + AGENTMAIL_FROM).

No secrets in code — read from env / backend/.env (gitignored).
"""
import os
import urllib.request
import urllib.parse
import json
import logging

logger = logging.getLogger(__name__)

AGENTMAIL_KEY = os.environ.get("AGENTMAIL_API_KEY") or ""
AGENTMAIL_FROM = os.environ.get("AGENTMAIL_FROM") or "zeraphina@agentmail.to"
AGENTMAIL_BASE = os.environ.get("AGENTMAIL_BASE") or "https://api.agentmail.to"


def _send(to: str, subject: str, text: str, html: str | None = None) -> bool:
    if not AGENTMAIL_KEY:
        logger.warning("AGENTMAIL_API_KEY not set — skipping email to %s", to)
        return False
    payload = {"to": [to], "subject": subject, "text": text}
    if html:
        payload["html"] = html
    url = f"{AGENTMAIL_BASE}/inboxes/{urllib.parse.quote(AGENTMAIL_FROM, safe='@')}/messages/send"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {AGENTMAIL_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8")
            logger.info("Sent '%s' to %s -> %s", subject, to, body[:120])
            return True
    except Exception as e:  # noqa: BLE001
        logger.error("AgentMail send failed to %s: %s", to, e)
        return False


def send_verification_email(to: str, verification_link: str) -> bool:
    subject = "Verify your SovereignHex account"
    text = (
        "Welcome to SovereignHex.\n\n"
        "Click the link below to verify your email and activate your account:\n"
        f"{verification_link}\n\n"
        "If you didn't create this account, you can ignore this email.\n"
    )
    html = (
        "<p>Welcome to <strong>SovereignHex</strong>.</p>"
        f"<p>Click the button below to verify your email and activate your account:</p>"
        f"<p><a href=\"{verification_link}\" style=\"display:inline-block;padding:12px 20px;"
        "background:#0a0a0a;color:#fff;border-radius:999px;text-decoration:none\">"
        "Verify email</a></p>"
        f"<p><small>{verification_link}</small></p>"
        "<p>If you didn't create this account, you can ignore this email.</p>"
    )
    return _send(to, subject, text, html)


def send_welcome_email(to: str, nation_name: str | None = None) -> bool:
    subj = "Welcome to SovereignHex"
    text = f"Welcome to SovereignHex{nation_name and f', {nation_name}' or ''}! Your account is active. Found your nation and shape its fate."
    return _send(to, subj, text)
