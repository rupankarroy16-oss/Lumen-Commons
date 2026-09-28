from hashlib import sha256

from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from app.config import Settings
from app.privacy import redact_sensitive_text


class DisclosurePlan(BaseModel):
    plain_language_requirement: str = Field(max_length=300)
    proof_steps: list[str] = Field(min_length=3, max_length=6)
    remains_private: list[str] = Field(min_length=3, max_length=8)
    becomes_public: list[str] = Field(min_length=2, max_length=6)
    verifier_message: str = Field(max_length=240)
    ambiguity_flags: list[str] = Field(max_length=5)
    used_fallback: bool = False
    requirement_hash: str


def deterministic_plan(public_requirement: str, labels: list[str], digest: str) -> DisclosurePlan:
    return DisclosurePlan(
        plain_language_requirement=public_requirement,
        proof_steps=[
            "Read the public district and minimum-age rule.",
            "Load the resident credential from encrypted local storage.",
            "Prove eligibility and derive a campaign-specific nullifier on the holder device.",
            "Publish only the category, proof outcome, and nullifier-backed uniqueness result.",
        ],
        remains_private=[
            "resident identity",
            "exact address and birth date",
            "holder secret and credential",
            "private notes",
        ],
        becomes_public=["campaign identifier", "eligibility satisfied", "response category"],
        verifier_message=(
            "A valid Midnight proof confirms one eligible resident submitted this category."
        ),
        ambiguity_flags=(
            ["Sensitive-looking text was removed before planning: " + ", ".join(labels)]
            if labels
            else []
        ),
        used_fallback=True,
        requirement_hash=digest,
    )


async def compose_disclosure_plan(
    public_requirement: str, public_labels: list[str], settings: Settings
) -> DisclosurePlan:
    redacted_requirement, redaction_labels = redact_sensitive_text(public_requirement)
    digest = sha256(redacted_requirement.encode("utf-8")).hexdigest()
    if not settings.gemini_api_key:
        return deterministic_plan(redacted_requirement, redaction_labels, digest)

    allowed_labels = [label[:60] for label in public_labels[:8]]
    prompt = f"""You design a privacy-safe zero-knowledge proof explanation for a civic survey.
Use only the public information below. Never request or infer identity, address, birth date,
wallet address, credentials, witness values, free-text feedback, or holder secrets.

Public requirement: {redacted_requirement}
Approved public response labels: {allowed_labels}

Explain the proof in accessible language. Treat eligibility as a boolean claim, not a request
for the underlying attributes. The public disclosure is limited to campaign identifier,
eligibility satisfied, and one approved response label.
"""
    client = genai.Client(api_key=settings.gemini_api_key)
    try:
        response = await client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=DisclosurePlan,
            ),
        )
        parsed = DisclosurePlan.model_validate_json(response.text)
        return parsed.model_copy(update={"used_fallback": False, "requirement_hash": digest})
    except Exception:
        return deterministic_plan(redacted_requirement, redaction_labels, digest)
