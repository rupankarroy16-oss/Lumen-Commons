import re

REDACTIONS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("email", re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)),
    ("phone", re.compile(r"(?<!\d)(?:\+?\d[\d\s().-]{7,}\d)(?!\d)")),
    ("wallet", re.compile(r"\bmn_(?:addr|shield|dust)[a-zA-Z0-9_]{12,}\b", re.I)),
    (
        "seed phrase",
        re.compile(
            r"\b(?:seed|mnemonic|recovery)\s+(?:phrase|words?)\s*[:=-]?\s*[a-z ]{20,}",
            re.I,
        ),
    ),
    (
        "identity number",
        re.compile(r"\b(?:passport|ssn|aadhaar|national\s+id)\s*[:#-]?\s*[A-Z0-9-]{5,}\b", re.I),
    ),
    (
        "exact address",
        re.compile(
            r"\b\d{1,6}\s+[A-Za-z0-9 .'-]+\s(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr)\b",
            re.I,
        ),
    ),
)


def redact_sensitive_text(text: str) -> tuple[str, list[str]]:
    cleaned = text
    labels: list[str] = []
    for label, pattern in REDACTIONS:
        cleaned, count = pattern.subn(f"[REDACTED {label.upper()}]", cleaned)
        if count:
            labels.append(label)
    return cleaned, labels
