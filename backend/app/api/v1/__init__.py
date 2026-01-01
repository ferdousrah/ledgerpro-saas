from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List

from ...database import get_db
from ...models.activity_log import ActivityLog
from ...models.auth import User
from ...schemas.activity_log import ActivityLogResponse
from ..deps import get_current_user

from .auth import router as auth_router
from .accounts import router as accounts_router
from .categories import router as categories_router
from .transactions import router as transactions_router
from .partners import router as partners_router
from .tax_rates import router as tax_rates_router
from .export import router as export_router
from .users import router as users_router
from .fiscal_years import router as fiscal_years_router
from .reports import router as reports_router
from .invoices import router as invoices_router
from .recurring_invoices import router as recurring_invoices_router
from .products import router as products_router
from .product_categories import router as product_categories_router
from .warehouses import router as warehouses_router
from .stock_movements import router as stock_movements_router
from .upload import router as upload_router

api_router = APIRouter()

# Include all routers
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users_router, prefix="/users", tags=["User Management"])
api_router.include_router(accounts_router, prefix="/accounts", tags=["Money Accounts"])
api_router.include_router(categories_router, prefix="/categories", tags=["Categories"])
api_router.include_router(transactions_router, prefix="/transactions", tags=["Transactions"])
api_router.include_router(partners_router, prefix="/partners", tags=["Partners"])
api_router.include_router(tax_rates_router, prefix="/tax-rates", tags=["Tax Rates"])
api_router.include_router(export_router, prefix="/export", tags=["Data Export"])
api_router.include_router(fiscal_years_router, prefix="/fiscal-years", tags=["Financial Years"])
api_router.include_router(reports_router, prefix="/reports", tags=["Financial Reports"])
api_router.include_router(products_router, prefix="/products", tags=["Products/Services"])
api_router.include_router(product_categories_router, prefix="/product-categories", tags=["Product Categories"])
api_router.include_router(warehouses_router, prefix="/warehouses", tags=["Warehouses"])
api_router.include_router(stock_movements_router, prefix="/stock-movements", tags=["Stock Movements"])
api_router.include_router(invoices_router, prefix="/invoices", tags=["Invoices"])
api_router.include_router(recurring_invoices_router, prefix="/recurring-invoices", tags=["Recurring Invoices"])
api_router.include_router(upload_router, prefix="/upload", tags=["File Upload"])

# Activity logs endpoints - defined directly here as a workaround
@api_router.get("/activity-logs", response_model=List[ActivityLogResponse], tags=["Activity Logs"])
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
