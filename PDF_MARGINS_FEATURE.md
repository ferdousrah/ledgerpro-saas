# PDF Margin Settings Feature

## Overview
Added configurable PDF margin settings to the Settings page, allowing users to customize the top and bottom margins for invoice PDFs. This is particularly useful for businesses using pre-printed letterheads.

## Changes Made

### Backend Changes

#### 1. Database Model (`backend/app/models/auth.py`)
Added two new fields to the `Tenant` model:
- `pdf_top_margin` (Integer, default: 70mm) - Space for company letterhead
- `pdf_bottom_margin` (Integer, default: 20mm) - Space for footer

#### 2. API Schemas (`backend/app/schemas/auth.py`)
Updated the following schemas to include PDF margin fields:
- `TenantBase` - Added `pdf_top_margin` and `pdf_bottom_margin` with defaults
- `TenantSettingsUpdate` - Added optional fields with validation (0-200mm range)

#### 3. Database Migration
Created new migration file: `backend/migrations/010_add_pdf_margins_to_tenants.sql`
- Adds `pdf_top_margin` and `pdf_bottom_margin` columns to `tenants` table
- Sets default values for existing rows
- Includes helpful comments

Migration script: `backend/run_pdf_margins_migration.py`

### Frontend Changes

#### 1. Type Definitions (`frontend/src/types/index.ts`)
Updated `Tenant` interface to include:
- `pdf_top_margin: number` - Space for company letterhead (mm)
- `pdf_bottom_margin: number` - Space for footer (mm)

#### 2. Settings Page (`frontend/src/pages/SettingsPage.tsx`)
Added new section "PDF Invoice Settings" with:
- **PDF Top Margin (mm)** input field
  - Range: 0-200mm
  - Default: 70mm
  - Helper text: "Space for company letterhead"
- **PDF Bottom Margin (mm)** input field
  - Range: 0-200mm
  - Default: 20mm
  - Helper text: "Space for footer"

Both fields:
- Are part of the Company Information section
- Support edit/view modes (filled variant when disabled, outlined when editing)
- Include validation to ensure values stay within 0-200mm range
- Display current values with helpful descriptions

#### 3. Invoice Detail Page (`frontend/src/pages/InvoiceDetailPage.tsx`)
Updated to pass PDF margin settings from tenant to `InvoicePdfButtons`:
```typescript
<InvoicePdfButtons
  invoice={invoice}
  variant="full"
  pdfOptions={{
    topMargin: tenant?.pdf_top_margin,
    bottomMargin: tenant?.pdf_bottom_margin,
  }}
/>
```

#### 4. PDF Generation Utility (`frontend/src/utils/invoicePdf.ts`)
Already supports dynamic margins via the `options` parameter (implemented in previous iteration).

## How It Works

1. **User Configuration**:
   - User navigates to Settings page
   - Clicks "Edit" button in Company Information section
   - Scrolls down to "PDF Invoice Settings" section
   - Adjusts top and bottom margins as needed
   - Clicks "Save Changes"

2. **PDF Generation**:
   - When user downloads or prints an invoice
   - `InvoiceDetailPage` reads `pdf_top_margin` and `pdf_bottom_margin` from tenant settings
   - Passes these values to `InvoicePdfButtons` via `pdfOptions` prop
   - `InvoicePdfButtons` forwards them to `generateInvoicePDF` function
   - PDF is generated with custom margins

3. **Default Behavior**:
   - If margins are not set in tenant settings, defaults are used (70mm top, 20mm bottom)
   - Existing tenants will get default values via migration

## Installation Steps

### 1. Run Database Migration

**Option A: Using Python script (Recommended)**
```bash
cd backend
py -3.13 run_pdf_margins_migration.py
```

**Option B: Using psql directly**
```bash
psql -U postgres -d ledgerpro -f migrations/010_add_pdf_margins_to_tenants.sql
```

**Option C: Using DBeaver or pgAdmin**
- Open the migration file: `backend/migrations/010_add_pdf_margins_to_tenants.sql`
- Copy and execute the SQL in your database tool

### 2. Restart Backend Server
The backend will automatically pick up the new model fields. Just restart if it's running:
```bash
# Stop current server (Ctrl+C)
# Start server again
cd backend
py -3.13 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Already Updated
No additional steps needed - the frontend changes are already in place and TypeScript compiled successfully.

### 4. Test the Feature
1. Login to the application
2. Navigate to Settings page
3. Click "Edit" in Company Information section
4. Scroll down to see "PDF Invoice Settings"
5. Adjust margins and save
6. Go to any invoice detail page
7. Click "Download PDF" or "Print"
8. Verify the PDF has the correct margins

## Technical Details

### Validation
- **Range**: 0-200mm (enforced in both frontend and backend)
- **Type**: Integer (whole numbers only)
- **Required**: No (uses defaults if not provided)

### Default Values
- **Top Margin**: 70mm (suitable for standard letterheads)
- **Bottom Margin**: 20mm (suitable for footers)

### PDF Coordinate System
- PDFs use millimeters as the unit
- Top margin: Measured from the top edge of the A4 page (297mm height)
- Bottom margin: Reserved space at the bottom

### Backward Compatibility
- Existing tenants will get default values via migration
- Existing invoices will use new margin settings when regenerated
- No breaking changes to existing functionality

## Files Modified

### Backend
1. `backend/app/models/auth.py` - Added fields to Tenant model
2. `backend/app/schemas/auth.py` - Updated TenantBase and TenantSettingsUpdate
3. `backend/migrations/010_add_pdf_margins_to_tenants.sql` - New migration file
4. `backend/run_pdf_margins_migration.py` - New migration script

### Frontend
1. `frontend/src/types/index.ts` - Updated Tenant interface
2. `frontend/src/pages/SettingsPage.tsx` - Added PDF margin input fields
3. `frontend/src/pages/InvoiceDetailPage.tsx` - Pass margins to PDF buttons

### No Changes Needed
- `frontend/src/utils/invoicePdf.ts` - Already supports dynamic margins
- `frontend/src/components/invoice/InvoicePdfButtons.tsx` - Already accepts pdfOptions

## Troubleshooting

### Migration Fails
If the migration fails with "column already exists":
```sql
-- Check if columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tenants'
AND column_name IN ('pdf_top_margin', 'pdf_bottom_margin');
```

### Settings Not Saving
- Check browser console for errors
- Verify backend is running and accepting requests
- Check that migration has been run successfully

### PDFs Not Using New Margins
- Verify tenant settings were saved (check in Settings page)
- Ensure you're on an invoice detail page (margins only apply there)
- Try hard-refreshing the page (Ctrl+F5)

## Future Enhancements

Possible future improvements:
- Per-invoice margin override
- Margin presets (A4 letterhead, US Letter, etc.)
- Visual margin preview before PDF generation
- Page size selection (A4, Letter, Legal)
