"""Resend email service — fail-safe (a flaky email send never breaks the invite flow)."""
import os
import asyncio
import logging
from html import escape as html_escape

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
SENDER = os.environ.get("RESEND_SENDER", "Family Cookbook <onboarding@resend.dev>")
REPLY_TO = os.environ.get("RESEND_REPLY_TO")
APP_URL = (os.environ.get("APP_URL") or "").rstrip("/")

_resend_ready = False


def _init_resend():
    global _resend_ready
    if _resend_ready:
        return True
    if not RESEND_API_KEY:
        return False
    try:
        import resend  # noqa: F401
        import resend as _r
        _r.api_key = RESEND_API_KEY
        _resend_ready = True
        return True
    except Exception:
        logger.exception("Failed to initialize Resend SDK")
        return False


async def send_invitation_email(
    *, to_email: str, vault_name: str, inviter_name: str, accept_url: str,
) -> dict:
    """Send an invitation email. Returns {ok, id?, error?}."""
    if not _init_resend():
        return {"ok": False, "error": "email_not_configured"}

    safe_cb = html_escape(vault_name or "our family vault")
    safe_inviter = html_escape(inviter_name or "Someone")
    subject = f"{inviter_name} invited you to {vault_name}"

    html_content = f"""\
<!doctype html>
<html>
<body style="margin:0;padding:0;background:#FDFBF7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#2C302B;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FDFBF7;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#FDFBF7;">
        <tr><td style="padding:0 8px 28px;">
          <div style="width:56px;height:56px;border-radius:18px;background:#D96C4A;color:#FDFBF7;font-family:Georgia,serif;font-style:italic;font-weight:bold;font-size:24px;line-height:56px;text-align:center;">fc</div>
        </td></tr>
        <tr><td style="padding:0 8px;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8C857B;">A Mamascript invitation</p>
          <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:32px;line-height:1.15;color:#2C302B;">
            {safe_inviter} wants you to join <span style="color:#D96C4A;">{safe_cb}</span>.
          </h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#5B6359;">
            It's a shared place for the family.s recipes, rituals, and stories — the meals that taste like home. Once you join, you can read every entry,
            leave comments, and (if you'd like) record your own — in any language. We'll save your voice and write it out as English step cards.
          </p>
        </td></tr>
        <tr><td style="padding:18px 8px 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="border-radius:999px;background:#D96C4A;">
              <a href="{accept_url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#FDFBF7;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                Accept invitation
              </a>
            </td></tr>
          </table>
          <p style="margin:14px 0 0;font-size:12px;color:#8C857B;">
            Or paste this link in your browser:<br>
            <a href="{accept_url}" style="color:#D96C4A;word-break:break-all;">{accept_url}</a>
          </p>
        </td></tr>
        <tr><td style="border-top:1px solid rgba(140,133,123,0.25);padding:18px 8px 0;">
          <p style="margin:0;font-size:12px;color:#8C857B;font-style:italic;">
            With love, the family · You're getting this because {safe_inviter} added your email to {safe_cb}. Reply directly to let them know.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    text_content = (
        f"{inviter_name} invited you to {vault_name} — a Mamascript family vault.\n\n"
        f"Accept the invitation:\n{accept_url}\n\n"
        "When you sign up with this email, you'll be added automatically.\n"
        "You can read entries, comment, or even record your own — in any language."
    )

    params = {
        "from": SENDER,
        "to": [to_email],
        "subject": subject,
        "html": html_content,
        "text": text_content,
    }
    if REPLY_TO:
        params["reply_to"] = REPLY_TO

    try:
        import resend
        resp = await asyncio.to_thread(resend.Emails.send, params)
        email_id = resp.get("id") if isinstance(resp, dict) else None
        return {"ok": True, "id": email_id}
    except Exception as e:
        logger.warning("Resend email failed for %s: %s", to_email, e)
        return {"ok": False, "error": str(e)[:200]}


def build_accept_url(email: str, base: str = None) -> str:
    """The link in the email — opens our register page with the email pre-filled."""
    base_url = (base or APP_URL or "").rstrip("/")
    from urllib.parse import quote
    return f"{base_url}/register?email={quote(email)}"
