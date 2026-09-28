"""Initial public-only Lumen Commons schema."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260924_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "campaigns",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("public_id", sa.String(64), nullable=False),
        sa.Column("title", sa.String(180), nullable=False),
        sa.Column("public_requirement", sa.String(500), nullable=False),
        sa.Column("district_label", sa.String(100), nullable=False),
        sa.Column("contract_address", sa.String(128), nullable=True),
        sa.Column("network", sa.String(16), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("public_id"),
    )
    op.create_index("ix_campaigns_public_id", "campaigns", ["public_id"])
    op.create_table(
        "proof_receipts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("campaign_public_id", sa.String(64), nullable=False),
        sa.Column("contract_address", sa.String(128), nullable=False),
        sa.Column("transaction_id", sa.String(128), nullable=False),
        sa.Column("network", sa.String(16), nullable=False),
        sa.Column("outcome", sa.String(24), nullable=False),
        sa.Column("disclosure_scope", sa.JSON(), nullable=False),
        sa.Column("finalized_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("transaction_id"),
    )
    op.create_index("ix_proof_receipts_campaign", "proof_receipts", ["campaign_public_id"])
    op.create_index("ix_proof_receipts_contract", "proof_receipts", ["contract_address"])
    op.create_index("ix_proof_receipts_transaction", "proof_receipts", ["transaction_id"])
    op.create_table(
        "gemini_plan_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("requirement_hash", sa.String(64), nullable=False),
        sa.Column("model", sa.String(80), nullable=False),
        sa.Column("used_fallback", sa.Boolean(), nullable=False),
        sa.Column("response_labels", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_gemini_plan_hash", "gemini_plan_records", ["requirement_hash"])
    op.create_table(
        "aggregate_metrics",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("campaign_public_id", sa.String(64), nullable=False),
        sa.Column("finalized_proofs", sa.Integer(), nullable=False),
        sa.Column("support_count", sa.Integer(), nullable=False),
        sa.Column("unsure_count", sa.Integer(), nullable=False),
        sa.Column("concern_count", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("campaign_public_id"),
    )
    op.create_index("ix_aggregate_campaign", "aggregate_metrics", ["campaign_public_id"])


def downgrade() -> None:
    op.drop_table("aggregate_metrics")
    op.drop_table("gemini_plan_records")
    op.drop_table("proof_receipts")
    op.drop_table("campaigns")
