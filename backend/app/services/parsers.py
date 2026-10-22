"""Document and chat export parsers for Eternia memory ingestion."""

import io
import re
from typing import Any, Dict, List, Optional
import pypdf
import docx

# Regex patterns for WhatsApp chat export formats
WHATSAPP_PATTERNS = [
    # 12/31/20, 11:59 PM - Name: Message OR 31/12/2020, 11:59 pm - Name: Message
    re.compile(
        r"^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M|[ap]m)?)\s*[-—]\s*([^:]+):\s*(.*)$",
        re.MULTILINE,
    ),
    # [31/12/20, 23:59:00] Name: Message OR [8/7/26, 3:52:34 PM] Name: Message
    re.compile(
        r"^\[(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M|[ap]m)?)\]\s*([^:]+):\s*(.*)$",
        re.MULTILINE,
    ),
    # 31/12/2020, 23:59 - Name: Message (European/Indian 24h format)
    re.compile(
        r"^(\d{1,2}[/-]\d{1,2}[/-]\d{4}),?\s+(\d{1,2}:\d{2})\s*[-—]\s*([^:]+):\s*(.*)$",
        re.MULTILINE,
    ),
    # 2026-10-22, 18:30 - Name: Message (ISO date format)
    re.compile(
        r"^(\d{4}[/-]\d{1,2}[/-]\d{1,2}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M|[ap]m)?)\s*[-—]\s*([^:]+):\s*(.*)$",
        re.MULTILINE,
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

MAX_MEMORY_CONTENT_LENGTH = 8000  # Database check constraint is 1 to 10000 chars


def chunk_long_content(content: str, max_chars: int = MAX_MEMORY_CONTENT_LENGTH) -> List[str]:
    """Ensure content never exceeds database check constraint (10,000 chars max)."""
    content = content.strip()
    if not content:
        return []
    if len(content) <= max_chars:
        return [content]

    chunks = []
    remaining = content
    while remaining:
        if len(remaining) <= max_chars:
            chunks.append(remaining)
            break
        # Find best split point near max_chars
        split_idx = remaining.rfind("\n", 0, max_chars)
        if split_idx == -1 or split_idx < max_chars // 2:
            split_idx = remaining.rfind(". ", 0, max_chars)
        if split_idx == -1 or split_idx < max_chars // 2:
            split_idx = remaining.rfind(" ", 0, max_chars)
        if split_idx == -1 or split_idx == 0:
            split_idx = max_chars

        chunk = remaining[:split_idx].strip()
        if chunk:
            chunks.append(chunk)
        remaining = remaining[split_idx:].strip()

    return chunks


def is_system_whatsapp_message(text: str) -> bool:
    """Check if WhatsApp message is a system notification or omitted media."""
    norm = text.strip().lower()
    return any(omitted in norm for omitted in SYSTEM_OMITTED_MESSAGES)


def parse_plain_text(content: str) -> List[Dict[str, Any]]:
    """Parse plain text, splitting on multiple newlines and safely chunking oversized paragraphs."""
    raw_paras = [p.strip() for p in re.split(r"\n\s*\n", content) if p.strip()]
    if not raw_paras:
        return []

    memories = []
    for para in raw_paras:
        # Split paragraph if it exceeds database max limit
        chunks = chunk_long_content(para, max_chars=MAX_MEMORY_CONTENT_LENGTH)
        for chunk in chunks:
            memories.append(
                {
                    "content": chunk,
                    "source_type": "journal",
                    "memory_date": None,
                }
            )

    return memories


def parse_pdf(file_bytes: bytes) -> List[Dict[str, Any]]:
    """Extract text from PDF pages with safe chunking."""
    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    memories = []

    for page_num, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        text = text.strip()
        if text:
            chunks = chunk_long_content(text, max_chars=MAX_MEMORY_CONTENT_LENGTH)
            for idx, chunk in enumerate(chunks):
                memories.append(
                    {
                        "content": chunk,
                        "source_type": "journal",
                        "memory_date": None,
                        "metadata": {"page": page_num + 1, "subchunk": idx},
                    }
                )

    return memories


def parse_docx(file_bytes: bytes) -> List[Dict[str, Any]]:
    """Extract paragraphs from Word .docx file with safe chunking."""
    doc = docx.Document(io.BytesIO(file_bytes))
    memories = []

    current_section = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            if current_section:
                full_text = "\n".join(current_section)
                for chunk in chunk_long_content(full_text, max_chars=MAX_MEMORY_CONTENT_LENGTH):
                    memories.append(
                        {
                            "content": chunk,
                            "source_type": "journal",
                            "memory_date": None,
                        }
                    )
                current_section = []
        else:
            current_section.append(text)

    if current_section:
        full_text = "\n".join(current_section)
        for chunk in chunk_long_content(full_text, max_chars=MAX_MEMORY_CONTENT_LENGTH):
            memories.append(
                {
                    "content": chunk,
                    "source_type": "journal",
                    "memory_date": None,
                }
            )

    return memories


def parse_whatsapp_chat(content: str) -> List[Dict[str, Any]]:
    """Parse WhatsApp exported .txt file into clean individual memories."""
    # Normalize narrow non-breaking spaces and non-breaking spaces from iOS/Android exports
    content = content.replace("\u202f", " ").replace("\u00a0", " ")
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
                    # Push previous entry with safe chunking
                    for chunk in chunk_long_content(current_entry["content"], max_chars=MAX_MEMORY_CONTENT_LENGTH):
                        entry_copy = dict(current_entry)
                        entry_copy["content"] = chunk
                        entries.append(entry_copy)

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
        for chunk in chunk_long_content(current_entry["content"], max_chars=MAX_MEMORY_CONTENT_LENGTH):
            entry_copy = dict(current_entry)
            entry_copy["content"] = chunk
            entries.append(entry_copy)

    return entries


def parse_document(file_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
    """Dispatcher to parse any supported document based on extension."""
    lower_name = filename.lower()

    if lower_name.endswith(".pdf"):
        return parse_pdf(file_bytes)
    elif lower_name.endswith(".docx"):
        return parse_docx(file_bytes)
    else:
        # Default text decode attempt
        text_content = file_bytes.decode("utf-8", errors="replace")
        clean_sample = text_content[:15000].replace("\u202f", " ").replace("\u00a0", " ")
        # Check if it contains WhatsApp chat format anywhere in first 15k chars
        if any(pattern.search(clean_sample) for pattern in WHATSAPP_PATTERNS):
            return parse_whatsapp_chat(text_content)
        return parse_plain_text(text_content)
