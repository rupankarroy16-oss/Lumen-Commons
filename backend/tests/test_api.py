from datetime import UTC, datetime

import pytest
from pydantic import ValidationError
from sqlalchemy import select

from app.config import Settings
from app.database import SessionLocal
from app.gemini_service import compose_disclosure_plan
from app.models import AggregateMetric, Campaign
from app.privacy import redact_sensitive_text
from app.schemas import ProofReceiptCreate


def test_api_cors_origins_accepts_render_plain_url(monkeypatch):
    monkeypatch.setenv("API_CORS_ORIGINS", "https://lumen-commons.netlify.app")

    settings = Settings()

    assert settings.api_cors_origins == ["https://lumen-commons.netlify.app"]


def test_api_cors_origins_accepts_comma_separated_urls(monkeypatch):
    monkeypatch.setenv(
        "API_CORS_ORIGINS",
        "https://lumen-commons.netlify.app, https://www.lumen-commons.example",
    )

    settings = Settings()

    assert settings.api_cors_origins == [
        "https://lumen-commons.netlify.app",
        "https://www.lumen-commons.example",
    ]


def test_neon_urls_are_normalized_for_asyncpg():
    settings = Settings(
        database_url=(
            "postgresql://resident:secret@ep-example-pooler.aws.neon.tech/neondb"
            "?sslmode=require&channel_binding=require"
        ),
        database_url_unpooled=(
            "postgresql://resident:secret@ep-example.aws.neon.tech/neondb"
            "?sslmode=require&channel_binding=require"
        ),
    )

    assert settings.database_url == (
        "postgresql+asyncpg://resident:secret@ep-example-pooler.aws.neon.tech/neondb"
        "?ssl=require"
    )
    assert settings.database_url_unpooled == (
        "postgresql+asyncpg://resident:secret@ep-example.aws.neon.tech/neondb"
        "?ssl=require"
    )


async def test_health_endpoint(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


async def test_gemini_has_deterministic_fallback_without_key():
    settings = Settings(gemini_api_key=None)
    plan = await compose_disclosure_plan(
        "Residents of North Harbor aged 16+ may submit one response.",
        ["support", "unsure", "concern"],
        settings,
    )
    assert plan.used_fallback is True
    assert "exact address and birth date" in plan.remains_private
    assert len(plan.requirement_hash) == 64


def test_sensitive_input_redaction():
    cleaned, labels = redact_sensitive_text(
        "Contact alex@example.com at +1 202 555 0142; passport AB123456 must not be sent."
    )
    assert "alex@example.com" not in cleaned
    assert "202 555" not in cleaned
    assert "AB123456" not in cleaned
    assert {"email", "phone", "identity number"}.issubset(labels)


def test_public_receipt_rejects_known_private_fields():
    payload = {
        "campaign_public_id": "harbor-park-2026",
        "contract_address": "contract_0123456789abcdef0123456789abcdef",
        "transaction_id": "abc1234567890def",
        "network": "preview",
        "outcome": "support",
        "disclosure_scope": ["campaign_id", "eligibility_satisfied", "response_category"],
        "finalized_at": datetime.now(UTC),
        "holder_secret": "must-never-arrive",
    }
    with pytest.raises(ValidationError, match="Private field"):
        ProofReceiptCreate.model_validate(payload)


async def test_receipt_updates_public_aggregate(client):
    async with SessionLocal() as session:
        session.add(
            Campaign(
                public_id="harbor-park-2026",
                title="Harbor Park",
                public_requirement="Residents of North Harbor aged 16+ may submit one response.",
                district_label="North Harbor",
                network="preview",
                active=True,
            )
        )
        session.add(AggregateMetric(campaign_public_id="harbor-park-2026"))
        await session.commit()

    response = await client.post(
        "/api/v1/receipts",
        json={
            "campaign_public_id": "harbor-park-2026",
            "contract_address": "contract_0123456789abcdef0123456789abcdef",
            "transaction_id": "finalized_0123456789abcdef",
            "network": "preview",
            "outcome": "support",
            "disclosure_scope": ["campaign_id", "eligibility_satisfied", "response_category"],
            "finalized_at": datetime.now(UTC).isoformat(),
        },
    )
    assert response.status_code == 201
    async with SessionLocal() as session:
        metric = await session.scalar(
            select(AggregateMetric).where(AggregateMetric.campaign_public_id == "harbor-park-2026")
        )
        assert metric is not None
        assert metric.finalized_proofs == 1
        assert metric.support_count == 1


async def test_duplicate_transaction_is_rejected(client):
    async with SessionLocal() as session:
        session.add(
            Campaign(
                public_id="harbor-park-2026",
                title="Harbor Park",
                public_requirement="Residents of North Harbor aged 16+ may submit one response.",
                district_label="North Harbor",
                network="preview",
                active=True,
            )
        )
        await session.commit()
    payload = {
        "campaign_public_id": "harbor-park-2026",
        "contract_address": "contract_0123456789abcdef0123456789abcdef",
        "transaction_id": "finalized_duplicate_123456",
        "network": "preview",
        "outcome": "unsure",
        "disclosure_scope": ["campaign_id", "eligibility_satisfied", "response_category"],
        "finalized_at": datetime.now(UTC).isoformat(),
    }
    assert (await client.post("/api/v1/receipts", json=payload)).status_code == 201
    assert (await client.post("/api/v1/receipts", json=payload)).status_code == 409
