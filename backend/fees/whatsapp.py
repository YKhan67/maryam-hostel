# fees/whatsapp.py
import json
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

WHATSAPP_API_BASE = "https://graph.facebook.com/v19.0"

def send_whatsapp_text(to_phone: str, text: str) -> bool:
    """
    Send a simple text message via WhatsApp Cloud API.
    to_phone: e.g. "923001234567" (no +).
    """
    token = getattr(settings, "WHATSAPP_TOKEN", None)
    phone_id = getattr(settings, "WHATSAPP_PHONE_ID", None)

    if not token or not phone_id:
        logger.error("WhatsApp config missing: WHATSAPP_TOKEN or WHATSAPP_PHONE_ID")
        return False

    url = f"{WHATSAPP_API_BASE}/{phone_id}/messages"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {
            "preview_url": False,
            "body": text,
        },
    }

    try:
        resp = requests.post(url, headers=headers, data=json.dumps(payload), timeout=10)
        if 200 <= resp.status_code < 300:
            logger.info("WhatsApp message sent to %s", to_phone)
            return True
        logger.error("WhatsApp API error %s: %s", resp.status_code, resp.text)
        return False
    except Exception as e:
        logger.exception("WhatsApp send error: %s", e)
        return False
