from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/assets", tags=["assets"])

@router.post("/", response_model=schemas.Asset)
def create_asset(asset: schemas.AssetCreate, db: Session = Depends(get_db)):
    """Create a new asset"""
    # Check if serial number already exists
    existing = crud.get_asset_by_serial(db, asset.serial_number)
    if existing:
        raise HTTPException(status_code=400, detail="Serial number already exists")
    return crud.create_asset(db, asset)

@router.get("/", response_model=List[schemas.Asset])
def get_assets(
    skip: int = 0,
    limit: int = 100,
    asset_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all assets with optional filters"""
    return crud.get_assets(db, skip, limit, asset_type, status, location)

@router.get("/{asset_id}", response_model=schemas.Asset)
def get_asset(asset_id: int, db: Session = Depends(get_db)):
    """Get a specific asset by ID"""
    asset = crud.get_asset(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

@router.put("/{asset_id}", response_model=schemas.Asset)
def update_asset(
    asset_id: int,
    asset_update: schemas.AssetUpdate,
    db: Session = Depends(get_db)
):
    """Update an asset"""
    asset = crud.update_asset(db, asset_id, asset_update)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

@router.delete("/{asset_id}")
def delete_asset(asset_id: int, db: Session = Depends(get_db)):
    """Delete an asset"""
    success = crud.delete_asset(db, asset_id)
    if not success:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {"message": "Asset deleted successfully"}

@router.get("/{asset_id}/history")
def get_asset_history(asset_id: int, db: Session = Depends(get_db)):
    """Get assignment history of an asset"""
    asset = crud.get_asset(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    history = crud.get_asset_history(db, asset_id)
    return {
        "asset_id": asset_id,
        "serial_number": asset.serial_number,
        "history": history
    }

# Additional inventory endpoints
@router.get("/stats/summary")
def get_asset_summary(db: Session = Depends(get_db)):
    """Get asset statistics summary"""
    from sqlalchemy import func
    from ..models import Asset
    
    stats = db.query(
        Asset.asset_type,
        Asset.status,
        func.count(Asset.asset_id).label('count')
    ).group_by(Asset.asset_type, Asset.status).all()
    
    summary = {}
    for asset_type, status, count in stats:
        if asset_type not in summary:
            summary[asset_type] = {}
        summary[asset_type][status] = count
    
    return summary