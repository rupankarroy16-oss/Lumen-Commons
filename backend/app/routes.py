from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_session
from app.gemini_service import DisclosurePlan, compose_disclosure_plan
from app.models import AggregateMetric, Campaign, GeminiPlanRecord, ProofReceipt
from app.schemas import CampaignRead, MetricsRead, PlanRequest, ProofReceiptCreate, ProofReceiptRead

router = APIRouter(prefix="/api/v1")
settings = get_settings()


@router.get("/campaigns/active", response_model=CampaignRead)
async def active_campaign(session: AsyncSession = Depends(get_session)) -> Campaign:
    campaign = await session.scalar(select(Campaign).where(Campaign.active.is_(True)).limit(1))
    if campaign is None:
        raise HTTPException(status_code=404, detail="No active campaign")
    return campaign


@router.get("/metrics", response_model=list[MetricsRead])
async def public_metrics(session: AsyncSession = Depends(get_session)) -> list[AggregateMetric]:
    return list((await session.scalars(select(AggregateMetric))).all())


@router.post(
    "/receipts",
    response_model=ProofReceiptRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_receipt(
    payload: ProofReceiptCreate, session: AsyncSession = Depends(get_session)
) -> ProofReceipt:
    campaign = await session.scalar(
        select(Campaign).where(Campaign.public_id == payload.campaign_public_id)
    )
    if campaign is None:
        raise HTTPException(status_code=404, detail="Unknown campaign")
    receipt = ProofReceipt(**payload.model_dump())
    metric = await session.scalar(
        select(AggregateMetric).where(
            AggregateMetric.campaign_public_id == payload.campaign_public_id
        )
    )
    if metric is None:
        metric = AggregateMetric(
            campaign_public_id=payload.campaign_public_id,
            finalized_proofs=0,
            support_count=0,
            unsure_count=0,
            concern_count=0,
        )
        session.add(metric)
    metric.finalized_proofs += 1
    setattr(metric, f"{payload.outcome}_count", getattr(metric, f"{payload.outcome}_count") + 1)
    session.add(receipt)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Receipt already recorded") from exc
    await session.refresh(receipt)
    return receipt


@router.post("/plans/compose", response_model=DisclosurePlan)
async def compose_plan(
    payload: PlanRequest, session: AsyncSession = Depends(get_session)
) -> DisclosurePlan:
    plan = await compose_disclosure_plan(
        payload.public_requirement, payload.public_response_labels, settings
    )
    session.add(
        GeminiPlanRecord(
            requirement_hash=plan.requirement_hash,
            model=settings.gemini_model if not plan.used_fallback else "deterministic-local",
            used_fallback=plan.used_fallback,
            response_labels=payload.public_response_labels,
        )
    )
    await session.commit()
    return plan
