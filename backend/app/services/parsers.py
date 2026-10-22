"""Document and chat export parsers for Eternia memory ingestion."""

import io
import re
from datetime import datetime
from typing import Any, Dict, List, Optional
import pypdf
import docx

# Regex patterns for WhatsApp chat export formats
WHATSAPP_PATTERNS = [
    # 12/31/20, 11:59 PM - Name: Message
    re.compile(
        r"^(\d{1,2}/\d{1,2}/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M|[ap]m)?)\s*-\s*([^:]+):\s*(.*)$"
    ),
    # [31/12/20, 23:59:00] Name: Message
    re.compile(
        r"^\[(\d{1,2}/\d{1,2}/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M|[ap]m)?)\]\s*([^:]+):\s*(.*)$"
    ),
    # 31/12/2020, 23:59 - Name: Message (European/Indian format)
    re.compile(
        r"^(\d{1,2}/\d{1,2}/\d{4}),?\s+(\d{1,2}:\d{2})\s*-\s*([^:]+):\s*(.*)$"
    ),
]

SYSTEM_OMITTED_MESSAGES = [
    "<media omitted>",
    "image omitted",
    "audio omitted",
    "video omitted",
    "sticker omitted",
    "document omitted",
    "messages and calls are end-to-end encrypted",
    "this message was deleted",
]


def is_system_whatsapp_message(text: str) -> bool:
    """Check if WhatsApp message is a system notification or omitted media."""
    norm = text.strip().lower()
    return any(omitted in norm for omitted in SYSTEM_OMITTED_MESSAGES)


def parse_plain_text(content: str) -> List[Dict[str, Any]]:
    """Parse plain text, splitting on multiple newlines if distinct paragraphs exist."""
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", content) if p.strip()]
    if not paragraphs:
        return []

    return [
        {
            "content": para,
            "source_type": "journal",
            "memory_date": None,
        }
        for para in paragraphs
    ]


def parse_pdf(file_bytes: bytes) -> List[Dict[str, Any]]:
    """Extract text from PDF pages."""
    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    memories = []

    for page_num, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        text = text.strip()
        if text:
            memories.append(
                {
                    "content": text,
                    "source_type": "journal",
                    "memory_date": None,
                    "metadata": {"page": page_num + 1},
                }
            )

    return memories


def parse_docx(file_bytes: bytes) -> List[Dict[str, Any]]:
    """Extract paragraphs from Word .docx file."""
    doc = docx.Document(io.BytesIO(file_bytes))
    memories = []

    current_section = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            if current_section:
                memories.append(
                    {
                        "content": "\n".join(current_section),
                        "source_type": "journal",
                        "memory_date": None,
                    }
                )
                current_section = []
        else:
            current_section.append(text)

    if current_section:
        memories.append(
            {
                "content": "\n".join(current_section),
                "source_type": "journal",
                "memory_date": None,
            }
        )

    return memories


def parse_whatsapp_chat(content: str) -> List[Dict[str, Any]]:
    """Parse WhatsApp exported .txt file into clean individual memories."""
    lines = content.splitlines()
    entries = []
    current_entry: Optional[Dict[str, Any]] = None

    for line in lines:
        line_clean = line.strip()
        if not line_clean:
            continue

        matched = False
        for pattern in WHATSAPP_PATTERNS:
            match = pattern.match(line_clean)
            if match:
                matched = True
                date_str, time_str, sender, msg_text = match.groups()

                if is_system_whatsapp_message(msg_text):
                    continue

                if current_entry:
                    entries.append(current_entry)

                current_entry = {
                    "content": f"{sender}: {msg_text.strip()}",
                    "source_type": "chat_export",
                    "sender": sender.strip(),
                    "raw_date": f"{date_str} {time_str}",
                    "metadata": {"sender": sender.strip(), "date_str": date_str},
                }
                break

        if not matched and current_entry:
            # Multi-line message continuation
            current_entry["content"] += f"\n{line_clean}"

    if current_entry:
        entries.append(current_entry)

    return entries


def parse_document(file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
    """Dispatcher to parse any supported document based on extension."""
    lower_name = filename.lower()

    if lower_name.endswith(".pdf"):
        return parse_pdf(file_bytes)
    elif lower_name.endswith(".docx"):
        return parse_docx(file_bytes)
    elif lower_name.endswith(".txt"):
        text_content = file_bytes.decode("utf-8", errors="replace")
        # Check if it looks like a WhatsApp export
        if any(pattern.search(text_content[:500]) for pattern in WHATSAPP_PATTERNS):
            return parse_whatsapp_chat(text_content)
        return parse_plain_text(text_content)
    else:
        # Default text decode attempt
        text_content = file_bytes.decode("utf-8", errors="replace")
        return parse_plain_text(text_content)
