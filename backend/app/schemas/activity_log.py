from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID
from app.models.activity_log import ActivityType, ActivityEntity


class ActivityLogCreate(BaseModel):
    activity_type: ActivityType
    entity_type: ActivityEntity
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    description: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class ActivityLogResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    user_id: UUID
    activity_type: ActivityType
    entity_type: ActivityEntity
    entity_id: Optional[str]
    entity_name: Optional[str]
    description: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime

    # Additional user info
    user_name: Optional[str] = None
    user_email: Optional[str] = None

    class Config:
        from_attributes = True


class ActivityLogFilter(BaseModel):
    user_id: Optional[UUID] = None
    activity_type: Optional[ActivityType] = None
    entity_type: Optional[ActivityEntity] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = 100
    offset: int = 0
