from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

PRIVATE_FIELD_TOKENS = {
    "age",
    "birthdate",
    "date_of_birth",
    "district",
    "exact_address",
    "holder_secret",
    "private_note",
    "raw_credential",
    "seed_phrase",
    "salary",
    "vote",
    "witness",
}


def reject_private_fields(value: Any, path: tuple[str, ...] = ()) -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            normalized = key.lower().replace("-", "_")
            if normalized in PRIVATE_FIELD_TOKENS:
                location = ".".join((*path, key))
                raise ValueError(f"Private field is not allowed in public receipt: {location}")
            reject_private_fields(child, (*path, key))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            reject_private_fields(child, (*path, str(index)))


class ProofReceiptCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    campaign_public_id: str = Field(min_length=3, max_length=64)
    contract_address: str = Field(min_length=32, max_length=128, pattern=r"^[A-Za-z0-9:_-]+$")
    transaction_id: str = Field(min_length=16, max_length=128, pattern=r"^[A-Za-z0-9:_-]+$")
    network: Literal["preview", "preprod"]
    outcome: Literal["support", "unsure", "concern"]
    disclosure_scope: list[Literal["campaign_id", "eligibility_satisfied", "response_category"]]
    finalized_at: datetime

    @model_validator(mode="before")
    @classmethod
    def enforce_privacy_boundary(cls, value: Any) -> Any:
        reject_private_fields(value)
        return value


class ProofReceiptRead(ProofReceiptCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


class MetricsRead(BaseModel):
    campaign_public_id: str
    finalized_proofs: int
    support_count: int
    unsure_count: int
    concern_count: int

    model_config = ConfigDict(from_attributes=True)


class CampaignRead(BaseModel):
    public_id: str
    title: str
    public_requirement: str
    district_label: str
    contract_address: str | None
    network: str
    active: bool

    model_config = ConfigDict(from_attributes=True)


class PlanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    public_requirement: str = Field(min_length=10, max_length=800)
    public_response_labels: list[str] = Field(min_length=2, max_length=8)

    @model_validator(mode="before")
    @classmethod
    def reject_private_payload_fields(cls, value: Any) -> Any:
        reject_private_fields(value)
        return value
