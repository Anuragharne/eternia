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


def group_chat_into_sessions(
    messages: List[Dict[str, Any]],
    max_msgs_per_session: int = 20,
    max_chars: int = 2500,
) -> List[Dict[str, Any]]:
    """Group sequential chat messages into coherent conversational dialogue memories."""
    if not messages:
        return []

    # If small number of messages (<= 8), keep individual messages
    if len(messages) <= 8:
        results = []
        for m in messages:
            results.append({
                "content": f"{m['sender']}: {m['text']}",
                "source_type": "chat_export",
                "sender": m["sender"],
                "raw_date": f"{m['date_str']} {m['time_str']}",
                "metadata": {"sender": m["sender"], "date_str": m["date_str"]},
            })
        return results

    sessions = []
    current_msgs: List[Dict[str, Any]] = []
    current_chars = 0

    def finalize_session(msgs: List[Dict[str, Any]]):
        if not msgs:
            return
        start_date = msgs[0]["date_str"]
        start_time = msgs[0]["time_str"]
        end_time = msgs[-1]["time_str"]
        participants = list(dict.fromkeys(m["sender"] for m in msgs))
        participants_str = " & ".join(participants[:3])
        if len(participants) > 3:
            participants_str += f" and {len(participants) - 3} others"

        header = f"Conversation between {participants_str} ({start_date} {start_time} - {end_time}):"
        dialogue = "\n".join(f"[{m['time_str']}] {m['sender']}: {m['text']}" for m in msgs)
        full_content = f"{header}\n\n{dialogue}"

        for chunk in chunk_long_content(full_content, max_chars=MAX_MEMORY_CONTENT_LENGTH):
            sessions.append({
                "content": chunk,
                "source_type": "chat_export",
                "sender": participants[0] if participants else "Unknown",
                "raw_date": f"{start_date} {start_time}",
                "metadata": {
                    "participants": participants,
                    "date_str": start_date,
                    "message_count": len(msgs),
                },
            })

    for msg in messages:
        line_str = f"[{msg['time_str']}] {msg['sender']}: {msg['text']}"
        date_changed = current_msgs and current_msgs[-1]["date_str"] != msg["date_str"]
        size_limit = len(current_msgs) >= max_msgs_per_session or (current_chars + len(line_str) > max_chars)

        if current_msgs and (date_changed or size_limit):
            finalize_session(current_msgs)
            current_msgs = []
            current_chars = 0

        current_msgs.append(msg)
        current_chars += len(line_str)

    if current_msgs:
        finalize_session(current_msgs)

    return sessions


def parse_whatsapp_chat(content: str) -> List[Dict[str, Any]]:
    """Parse WhatsApp exported .txt file into clean structured conversational memories."""
    # Normalize narrow non-breaking spaces and non-breaking spaces from iOS/Android exports
    content = content.replace("\u202f", " ").replace("\u00a0", " ")
    lines = content.splitlines()
    raw_messages = []
    current_msg: Optional[Dict[str, Any]] = None

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

                if current_msg:
                    raw_messages.append(current_msg)

                current_msg = {
                    "date_str": date_str.strip(),
                    "time_str": time_str.strip(),
                    "sender": sender.strip(),
                    "text": msg_text.strip(),
                }
                break

        if not matched and current_msg:
            # Multi-line message continuation
            current_msg["text"] += f"\n{line_clean}"

    if current_msg:
        raw_messages.append(current_msg)

    return group_chat_into_sessions(raw_messages)


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
