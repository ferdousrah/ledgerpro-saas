from fastapi import APIRouter
from .auth import router as auth_router
from .accounts import router as accounts_router
from .categories import router as categories_router
from .transactions import router as transactions_router
from .partners import router as partners_router
from .tax_rates import router as tax_rates_router
from .export import router as export_router

api_router = APIRouter()

# Include all routers
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(accounts_router, prefix="/accounts", tags=["Money Accounts"])
api_router.include_router(categories_router, prefix="/categories", tags=["Categories"])
api_router.include_router(transactions_router, prefix="/transactions", tags=["Transactions"])
api_router.include_router(partners_router, prefix="/partners", tags=["Partners"])
api_router.include_router(tax_rates_router, prefix="/tax-rates", tags=["Tax Rates"])
api_router.include_router(export_router, prefix="/export", tags=["Data Export"])
