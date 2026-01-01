"""
User Management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import uuid

from ...database import get_db
from ...models.auth import User, UserRole
from ...schemas.auth import UserResponse, UserCreateRequest, UserUpdateRequest
from ..deps import get_current_user
from ...core.security import get_password_hash
from ...models.activity_log import ActivityLog

router = APIRouter()


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that requires admin role"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can perform this action"
        )
    return current_user


@router.get("/", response_model=List[UserResponse])
def list_users(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    List all users in the current tenant.
    Only accessible by admin users.
    """
    query = db.query(User).filter(User.tenant_id == current_user.tenant_id)

    if not include_inactive:
        query = query.filter(User.is_active == True)

    users = query.order_by(User.created_at.desc()).all()
    return users


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Create a new user in the current tenant.
    Only accessible by admin users.
    """
    # Check if email already exists in this tenant
    existing_user = db.query(User).filter(
        User.email == user_data.email,
        User.tenant_id == current_user.tenant_id
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists in your organization"
        )

    # Create new user
    new_user = User(
        id=str(uuid.uuid4()),
        tenant_id=current_user.tenant_id,
        name=user_data.name,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Log activity
    activity = ActivityLog(
        id=str(uuid.uuid4()),
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        activity_type="create",
        entity_type="USER",
        entity_id=new_user.id,
        description=f"Created new user: {new_user.name} ({new_user.email}) with role {new_user.role}",
        created_at=datetime.utcnow()
    )
    db.add(activity)
    db.commit()

    return new_user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific user by ID.
    Users can view their own profile, admins can view any user in their tenant.
    """
    user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == current_user.tenant_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Allow users to view their own profile, or admins to view any user
    if user.id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this user"
        )

    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    user_data: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Update a user's information (role, name, email).
    Only accessible by admin users.
    """
    user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == current_user.tenant_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent admins from demoting themselves if they're the only admin
    if user.id == current_user.id and user_data.role and user_data.role != UserRole.ADMIN:
        admin_count = db.query(User).filter(
            User.tenant_id == current_user.tenant_id,
            User.role == UserRole.ADMIN,
            User.is_active == True,
            User.id != user.id
        ).count()

        if admin_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change your role. At least one admin must remain in the organization."
            )

    changes = []

    # Update fields if provided
    if user_data.name is not None:
        old_name = user.name
        user.name = user_data.name
        changes.append(f"name from '{old_name}' to '{user.name}'")

    if user_data.email is not None:
        # Check if new email is already in use
        existing = db.query(User).filter(
            User.email == user_data.email,
            User.tenant_id == current_user.tenant_id,
            User.id != user_id
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email is already in use by another user"
            )

        old_email = user.email
        user.email = user_data.email
        changes.append(f"email from '{old_email}' to '{user.email}'")

    if user_data.role is not None:
        old_role = user.role
        user.role = user_data.role
        changes.append(f"role from '{old_role}' to '{user.role}'")

    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    # Log activity
    if changes:
        activity = ActivityLog(
            id=str(uuid.uuid4()),
            tenant_id=current_user.tenant_id,
            user_id=current_user.id,
            activity_type="update",
            entity_type="USER",
            entity_id=user.id,
            description=f"Updated user {user.name}: {', '.join(changes)}",
            created_at=datetime.utcnow()
        )
        db.add(activity)
        db.commit()

    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Deactivate a user (soft delete).
    Only accessible by admin users.
    """
    user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == current_user.tenant_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent admins from deactivating themselves if they're the only admin
    if user.id == current_user.id:
        admin_count = db.query(User).filter(
            User.tenant_id == current_user.tenant_id,
            User.role == UserRole.ADMIN,
            User.is_active == True,
            User.id != user.id
        ).count()

        if admin_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate yourself. At least one admin must remain active."
            )

    user.is_active = False
    user.updated_at = datetime.utcnow()
    db.commit()

    # Log activity
    activity = ActivityLog(
        id=str(uuid.uuid4()),
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        activity_type="delete",
        entity_type="USER",
        entity_id=user.id,
        description=f"Deactivated user: {user.name} ({user.email})",
        created_at=datetime.utcnow()
    )
    db.add(activity)
    db.commit()

    return None


@router.put("/{user_id}/reactivate", response_model=UserResponse)
def reactivate_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Reactivate a deactivated user.
    Only accessible by admin users.
    """
    user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == current_user.tenant_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already active"
        )

    user.is_active = True
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    # Log activity
    activity = ActivityLog(
        id=str(uuid.uuid4()),
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        activity_type="update",
        entity_type="USER",
        entity_id=user.id,
        description=f"Reactivated user: {user.name} ({user.email})",
        created_at=datetime.utcnow()
    )
    db.add(activity)
    db.commit()

    return user
