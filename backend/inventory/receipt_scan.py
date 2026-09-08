# backend/inventory/receipt_scan.py
"""
AI-powered receipt scanning (Gemini 3.6 Flash - text block method).
Includes logging for diagnostics – all original logic is preserved.
"""

import difflib
import json
import uuid
import logging
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from hostels.models import Hostel
from .models import Category, Item, Unit, Vendor, Purchase

logger = logging.getLogger(__name__)

ALLOWED_ROLES = ["SUPER_ADMIN", "CITY_MANAGER", "HOSTEL_MANAGER", "PARTNER", "STAFF"]

EXTRACTION_PROMPT = """Analyze the purchase receipt/invoice in this image. The receipt may mix English and Urdu (Nastaliq script) text, but you must extract everything into English. Provide the response in the following strict format:

[VENDOR_START]
(Write only the exact vendor/shop name in English here - no extra text)
[VENDOR_END]

[ITEMS_START]
(Write each purchased item on a separate line in this exact pipe-separated format: Item Name | Quantity | Unit | Total Price)
(All text must be in English. For example: Rice | 10 | kg | 1200)
(Do not include tax lines, discount lines, or the grand total as an item. If quantity or unit is unclear, make a reasonable estimate.)
[ITEMS_END]
"""


def _best_match(name, candidates, key=lambda c: c.name, threshold=0.6):
    """Fuzzy-match name against candidates."""
    if not name or not candidates:
        return None, 0.0
    name_norm = name.strip().lower()
    best, best_score = None, 0.0
    for c in candidates:
        score = difflib.SequenceMatcher(None, name_norm, key(c).strip().lower()).ratio()
        if score > best_score:
            best, best_score = c, score
    if best_score >= threshold:
        return best, round(best_score, 2)
    return None, round(best_score, 2)


def _call_gemini(image_files):
    """
    Send prompt + images to Gemini and return raw response text.
    Logs the raw response to the console for debugging.
    """
    api_key = getattr(settings, "GEMINI_API_KEY", None)
    if not api_key:
        logger.error("GEMINI_API_KEY not configured")
        raise RuntimeError("GEMINI_API_KEY is not configured on the server.")

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        logger.error("google-genai not installed")
        raise RuntimeError("The google-genai package isn't installed on the server.")

    client = genai.Client(api_key=api_key)

    # Build parts: prompt text first, then image bytes
    parts = [types.Part.from_text(text=EXTRACTION_PROMPT)]
    for f in image_files:
        f.seek(0)
        mime = f.content_type or "image/jpeg"
        parts.append(types.Part.from_bytes(data=f.read(), mime_type=mime))

    user_content = types.Content(role="user", parts=parts)

    try:
        logger.debug("Calling Gemini model=gemini-3.6-flash with %d image(s)", len(image_files))
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=user_content
        )
        raw_text = response.text
        logger.info("Gemini raw response:\n%s", raw_text)   # <-- key debug line
        return raw_text
    except Exception as e:
        logger.exception("Gemini call failed")
        raise RuntimeError(f"AI scan failed: {e}")


def _parse_receipt_text(result_text):
    """
    Parse raw text into vendor_name and items list.
    If markers are missing, raises a RuntimeError that includes the raw text.
    """
    vendor_name = ""
    items_block = ""

    if "[VENDOR_START]" in result_text and "[VENDOR_END]" in result_text:
        vendor_name = result_text.split("[VENDOR_START]")[1].split("[VENDOR_END]")[0].strip()
    else:
        logger.error("Missing [VENDOR_START] block in raw text")
        # Include a snippet of raw text in the error for diagnosis
        raise RuntimeError("AI output did not include the [VENDOR_START] block. Raw text (first 500 chars): " + result_text[:500])

    if "[ITEMS_START]" in result_text and "[ITEMS_END]" in result_text:
        items_block = result_text.split("[ITEMS_START]")[1].split("[ITEMS_END]")[0].strip()
    else:
        logger.error("Missing [ITEMS_START] block in raw text")
        raise RuntimeError("AI output did not include the [ITEMS_START] block. Raw text (first 500 chars): " + result_text[:500])

    items = []
    for line in items_block.split("\n"):
        line = line.strip()
        if not line:
            continue
        parts = line.split("|")
        if len(parts) < 4:
            logger.warning("Skipping malformed item line: %s", line)
            continue
        name = parts[0].strip()
        try:
            quantity = float(parts[1].strip())
        except ValueError:
            quantity = 0
        unit_text = parts[2].strip()
        try:
            total_price = float(parts[3].strip())
        except ValueError:
            total_price = 0
        items.append({
            "name": name,
            "quantity": quantity,
            "unit": unit_text,
            "total_price": total_price,
        })

    if not items:
        logger.error("No items parsed from raw text")
        raise RuntimeError("No items were parsed from the AI response. Raw text (first 500 chars): " + result_text[:500])

    return {"vendor_name": vendor_name, "items": items}


class ScanReceiptView(APIView):
    """
    Step 1: upload photo(s) of a receipt, get back extracted + fuzzy-matched line items.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not (hasattr(request.user, "role") and request.user.role in ALLOWED_ROLES):
            return Response({"error": "You don't have permission to do this."}, status=403)

        hostel_id = request.data.get("hostel")
        if not hostel_id:
            return Response({"error": "hostel is required."}, status=400)

        images = request.FILES.getlist("images")
        if not images:
            return Response({"error": "At least one image is required."}, status=400)

        logger.info("ScanReceiptView: received %d image(s)", len(images))

        try:
            raw_text = _call_gemini(images)
        except RuntimeError as e:
            logger.error("Gemini call error: %s", e)
            return Response({"error": str(e)}, status=502)

        try:
            extracted = _parse_receipt_text(raw_text)
        except RuntimeError as e:
            logger.error("Parsing error: %s", e)
            return Response({"error": str(e)}, status=502)

        # ---- The rest is identical to the original logic ----
        vendors = list(Vendor.objects.all())
        vendor_match, _ = _best_match(extracted.get("vendor_name", ""), vendors)

        active_items = list(Item.objects.filter(is_active=True))
        units = list(Unit.objects.all())

        rows = []
        for raw in extracted.get("items", []):
            name = (raw.get("name") or "").strip()
            unit_text = (raw.get("unit") or "").strip()

            item_match, item_score = _best_match(name, active_items)
            unit_match, _ = _best_match(unit_text, units)

            try:
                quantity = float(raw.get("quantity") or 0)
            except (TypeError, ValueError):
                quantity = 0
            try:
                total_price = float(raw.get("total_price") or 0)
            except (TypeError, ValueError):
                total_price = 0

            rows.append({
                "scanned_name": name,
                "quantity": quantity,
                "scanned_unit": unit_text,
                "unit_id": unit_match.id if unit_match else None,
                "item_id": item_match.id if item_match else None,
                "is_new_item": item_match is None,
                "match_confidence": item_score,
                "total_price": total_price,
            })

        logger.info("Scan completed: vendor=%s, items=%d", extracted.get("vendor_name"), len(rows))

        return Response({
            "vendor_name": extracted.get("vendor_name", ""),
            "vendor_id": vendor_match.id if vendor_match else None,
            "items": rows,
            "available_items": [{"id": i.id, "name": i.name} for i in active_items],
            "available_units": [{"id": u.id, "name": u.name} for u in units],
        })


class ScanReceiptSaveView(APIView):
    """
    Step 2: the user-reviewed/edited item list -> actual Purchase rows.
    This class is unchanged from the original – only logging has been added for consistency.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not (hasattr(request.user, "role") and request.user.role in ALLOWED_ROLES):
            return Response({"error": "You don't have permission to do this."}, status=403)

        data = request.data
        hostel_id = data.get("hostel")

        items_raw = data.get("items")
        if isinstance(items_raw, str):
            try:
                items_payload = json.loads(items_raw)
            except json.JSONDecodeError:
                return Response({"error": "Invalid items payload."}, status=400)
        else:
            items_payload = items_raw or []

        if not hostel_id:
            return Response({"error": "hostel is required."}, status=400)
        if not items_payload:
            return Response({"error": "No items to save."}, status=400)

        try:
            hostel = Hostel.objects.get(id=hostel_id)
        except Hostel.DoesNotExist:
            return Response({"error": "Invalid hostel."}, status=400)

        user = request.user
        if hasattr(user, "role") and user.role in ["HOSTEL_MANAGER", "PARTNER", "STAFF"] and user.hostel:
            if user.hostel_id != hostel.id:
                return Response({"error": "You can only log purchases for your own hostel."}, status=403)

        vendor_id = data.get("vendor_id")
        vendor_name = (data.get("vendor_name") or "").strip() or "Unknown Vendor"
        vendor = None
        if vendor_id:
            candidate = Vendor.objects.filter(id=vendor_id).first()
            if candidate and candidate.name.strip().lower() == vendor_name.lower():
                vendor = candidate
        if vendor is None:
            vendor = Vendor.objects.filter(name__iexact=vendor_name).first()
            if vendor is None:
                vendor = Vendor.objects.create(name=vendor_name)

        default_category, _ = Category.objects.get_or_create(name="Uncategorized")

        invoice_photo = request.FILES.get("invoice_photo")
        invoice_no = data.get("invoice_no", "")
        purchase_date = data.get("date") or timezone.localdate().isoformat()

        created = []
        for row in items_payload:
            name = (row.get("name") or "").strip()
            if not name:
                continue

            try:
                quantity = Decimal(str(row.get("quantity") or 0))
                total_price = Decimal(str(row.get("total_price") or 0))
            except (InvalidOperation, TypeError):
                return Response({"error": f"Invalid quantity/price for item '{name}'."}, status=400)

            if quantity <= 0:
                continue

            unit_id = row.get("unit_id")
            unit = Unit.objects.filter(id=unit_id).first() if unit_id else None
            if unit is None:
                # No existing unit selected – check if a new unit name was provided
                unit_name = row.get("unit_name", "").strip()
                if not unit_name:
                    return Response({"error": f"'{name}' needs a unit selected or a new unit name."}, status=400)
                # Get-or-create the unit (case-insensitive)
                unit = Unit.objects.filter(name__iexact=unit_name).first()
                if unit is None:
                    unit = Unit.objects.create(name=unit_name)

            item_id = row.get("item_id")
            item = Item.objects.filter(id=item_id).first() if item_id else None
            if item is None:
                code = f"AI-{uuid.uuid4().hex[:8].upper()}"
                item = Item.objects.create(code=code, name=name, category=default_category, unit=unit)

            price_per_unit = (total_price / quantity) if quantity else Decimal("0")

            purchase = Purchase.objects.create(
                hostel=hostel, date=purchase_date, vendor=vendor,
                invoice_no=invoice_no, item=item, quantity=quantity,
                price_per_unit=price_per_unit,
            )
            created.append(purchase.id)

        if invoice_photo and created:
            first = Purchase.objects.get(id=created[0])
            first.invoice_photo = invoice_photo
            first.save(update_fields=["invoice_photo"])

        return Response({"created": len(created), "purchase_ids": created})