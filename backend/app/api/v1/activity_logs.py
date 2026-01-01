from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from ...database import get_db
from ...models.activity_log import ActivityLog
from ...models.auth import User
from ...schemas.activity_log import ActivityLogCreate, ActivityLogResponse, ActivityLogFilter
from ..deps import get_current_user

router = APIRouter()


@router.post("/", response_model=ActivityLogResponse, status_code=201)
def create_activity_log(
    log: ActivityLogCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new activity log entry"""
    db_log = ActivityLog(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        **log.dict(),
    )

    db.add(db_log)
    db.commit()
    db.refresh(db_log)

    # Add user info to response
    response = ActivityLogResponse.from_orm(db_log)
    response.user_name = current_user.name
    response.user_email = current_user.email

    return response


@router.get("/", response_model=List[ActivityLogResponse])
def get_activity_logs(
    user_id: str = None,
    activity_type: str = None,
    entity_type: str = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get activity logs with optional filters"""
    query = db.query(ActivityLog).filter(
        ActivityLog.tenant_id == current_user.tenant_id
    )

    if user_id:
        query = query.filter(ActivityLog.user_id == user_id)
    if activity_type:
        query = query.filter(ActivityLog.activity_type == activity_type)
    if entity_type:
        query = query.filter(ActivityLog.entity_type == entity_type)

    logs = query.order_by(desc(ActivityLog.created_at)).offset(offset).limit(limit).all()

    # Add user info to each log
    result = []
    for log in logs:
        log_response = ActivityLogResponse.from_orm(log)
        log_response.user_name = log.user.name
        log_response.user_email = log.user.email
        result.append(log_response)

    return result


@router.get("/{log_id}", response_model=ActivityLogResponse)
def get_activity_log(
    log_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific activity log by ID"""
    log = db.query(ActivityLog).filter(
        ActivityLog.id == log_id,
        ActivityLog.tenant_id == current_user.tenant_id
    ).first()

    if not log:
        raise HTTPException(status_code=404, detail="Activity log not found")

    log_response = ActivityLogResponse.from_orm(log)
    log_response.user_name = log.user.name
    log_response.user_email = log.user.email

    return log_response


# Helper function to log activities (to be used in other endpoints)
def log_activity(
    db: Session,
    user: User,
    activity_type: str,
    entity_type: str,
    entity_id: str = None,
    entity_name: str = None,
    description: str = None,
    request: Request = None,
):
    """Helper function to create activity log entries"""
    ip_address = None
    user_agent = None

    if request:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

    log = ActivityLog(
        tenant_id=user.tenant_id,
        user_id=user.id,
        activity_type=activity_type,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        description=description,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    db.add(log)
    db.commit()

    return log
