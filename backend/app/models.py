from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(180))
    public_requirement: Mapped[str] = mapped_column(String(500))
    district_label: Mapped[str] = mapped_column(String(100))
    contract_address: Mapped[str | None] = mapped_column(String(128), nullable=True)
    network: Mapped[str] = mapped_column(String(16), default="preview")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProofReceipt(Base):
    __tablename__ = "proof_receipts"

    id: Mapped[int] = mapped_column(primary_key=True)
    campaign_public_id: Mapped[str] = mapped_column(String(64), index=True)
    contract_address: Mapped[str] = mapped_column(String(128), index=True)
    transaction_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    network: Mapped[str] = mapped_column(String(16))
    outcome: Mapped[str] = mapped_column(String(24))
    disclosure_scope: Mapped[list[str]] = mapped_column(JSON)
    finalized_at: Mapped[datetime]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class GeminiPlanRecord(Base):
    __tablename__ = "gemini_plan_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    requirement_hash: Mapped[str] = mapped_column(String(64), index=True)
    model: Mapped[str] = mapped_column(String(80))
    used_fallback: Mapped[bool] = mapped_column(Boolean, default=False)
    response_labels: Mapped[list[str]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AggregateMetric(Base):
    __tablename__ = "aggregate_metrics"

    id: Mapped[int] = mapped_column(primary_key=True)
    campaign_public_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    finalized_proofs: Mapped[int] = mapped_column(Integer, default=0)
    support_count: Mapped[int] = mapped_column(Integer, default=0)
    unsure_count: Mapped[int] = mapped_column(Integer, default=0)
    concern_count: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
