"""
File Upload API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from pathlib import Path
import shutil
import uuid
from typing import Optional

from ...database import get_db
from ...models.auth import User, Tenant
from ...api.deps import get_current_user

router = APIRouter()

# Configuration
UPLOAD_DIR = Path("app/static/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 100 * 1024  # 100KB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


def validate_image_file(file: UploadFile) -> None:
    """Validate uploaded image file"""
    # Check file extension
    file_ext = Path(file.filename).suffix.lower() if file.filename else ""
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Check MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Must be an image."
        )


@router.post("/logo", response_model=dict)
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload company logo
    - Validates file type (images only)
    - Validates file size (max 2MB)
    - Saves to static/uploads directory
    - Returns the file URL
    """
    try:
        # Validate file
        validate_image_file(file)

        # Check file size
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()  # Get position (file size)
        file.file.seek(0)  # Reset to beginning

        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE / 1024}KB"
            )

        # Generate unique filename
        file_ext = Path(file.filename).suffix.lower() if file.filename else ".jpg"
        unique_filename = f"{current_user.tenant_id}_{uuid.uuid4()}{file_ext}"
        file_path = UPLOAD_DIR / unique_filename

        # Delete old logo if exists
        tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
        if tenant and tenant.logo_url:
            # Extract filename from URL
            old_filename = tenant.logo_url.split("/")[-1]
            old_file_path = UPLOAD_DIR / old_filename
            if old_file_path.exists():
                old_file_path.unlink()

        # Save file
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Update tenant logo_url
        logo_url = f"/static/uploads/{unique_filename}"
        tenant.logo_url = logo_url
        db.commit()

        return {
            "url": logo_url,
            "filename": unique_filename,
            "message": "Logo uploaded successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )
    finally:
        file.file.close()


@router.delete("/logo")
async def delete_logo(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete company logo"""
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()

    if not tenant or not tenant.logo_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No logo found"
        )

    # Delete file
    filename = tenant.logo_url.split("/")[-1]
    file_path = UPLOAD_DIR / filename
    if file_path.exists():
        file_path.unlink()

    # Update database
    tenant.logo_url = None
    db.commit()

    return {"message": "Logo deleted successfully"}
