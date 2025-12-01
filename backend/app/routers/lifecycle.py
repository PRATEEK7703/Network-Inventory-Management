from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import crud, schemas, models
from ..database import get_db
import datetime as datetime

router = APIRouter(prefix="/lifecycle", tags=["lifecycle"])

@router.post("/reclaim/{customer_id}")
def reclaim_customer_assets(customer_id: int, db: Session = Depends(get_db)):
    """Reclaim all assets from a deactivated customer"""
    try:
        result = crud.reclaim_customer_assets(db, customer_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reassign/{asset_id}")
def reassign_asset(
    asset_id: int,
    new_customer_id: int = Query(..., description="ID of the new customer"),
    db: Session = Depends(get_db)
):
    """Reassign an asset from one customer to another"""
    try:
        result = crud.reassign_asset(db, asset_id, new_customer_id)
        return {
            "message": "Asset reassigned successfully",
            **result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/replace-faulty")
def replace_faulty_asset(
    old_asset_id: int = Query(..., description="ID of the faulty asset"),
    new_asset_id: int = Query(..., description="ID of the replacement asset"),
    db: Session = Depends(get_db)
):
    """Replace a faulty asset with a working one"""
    try:
        result = crud.replace_faulty_asset(db, old_asset_id, new_asset_id)
        return {
            "message": "Asset replaced successfully",
            **result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/retire/{asset_id}")
def retire_asset(
    asset_id: int,
    reason: Optional[str] = Query(None, description="Reason for retirement"),
    db: Session = Depends(get_db)
):
    """Retire an asset permanently"""
    try:
        asset = crud.retire_asset(db, asset_id, reason)
        return {
            "message": "Asset retired successfully",
            "asset": asset
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/asset/{asset_id}/details")
def get_asset_lifecycle_details(asset_id: int, db: Session = Depends(get_db)):
    """Get complete lifecycle details of an asset including history"""
    result = crud.get_asset_lifecycle_details(db, asset_id)
    if not result:
        raise HTTPException(status_code=404, detail="Asset not found")
    return result

@router.get("/stats/utilization")
def get_asset_utilization_stats(db: Session = Depends(get_db)):
    """Get asset utilization statistics by type"""
    return crud.get_asset_utilization_stats(db)

@router.get("/maintenance/due")
def get_assets_due_for_maintenance(
    days: int = Query(365, description="Days threshold for maintenance check"),
    db: Session = Depends(get_db)
):
    """Get assets that may need maintenance (assigned for more than specified days)"""
    assets = crud.get_assets_due_for_maintenance(db, days)
    return {
        "threshold_days": days,
        "assets_due": len(assets),
        "assets": assets
    }

@router.get("/inactive-customers")
def get_inactive_customers(db: Session = Depends(get_db)):
    """Get all inactive customers with reclaimable assets"""
    customers = db.query(models.Customer).filter(
        models.Customer.status == 'Inactive'
    ).all()
    
    result = []
    for customer in customers:
        # Get assets still assigned
        assigned_assets = db.query(models.Asset).filter(
            models.Asset.assigned_to_customer_id == customer.customer_id
        ).all()
        
        result.append({
            "customer": customer,
            "assigned_assets_count": len(assigned_assets),
            "assigned_assets": assigned_assets
        })
    
    return result

@router.post("/bulk-reclaim")
def bulk_reclaim_assets(
    customer_ids: List[int],
    db: Session = Depends(get_db)
):
    """Reclaim assets from multiple customers at once"""
    results = []
    errors = []
    
    for customer_id in customer_ids:
        try:
            result = crud.reclaim_customer_assets(db, customer_id)
            results.append(result)
        except Exception as e:
            errors.append({
                "customer_id": customer_id,
                "error": str(e)
            })
    
    return {
        "total_processed": len(customer_ids),
        "successful": len(results),
        "failed": len(errors),
        "results": results,
        "errors": errors
    }

@router.get("/history/summary")
def get_lifecycle_history_summary(db: Session = Depends(get_db)):
    """Get summary of asset lifecycle activities"""
    from sqlalchemy import func
    from datetime import timedelta
    
    today = datetime.utcnow().date()
    last_30_days = datetime.utcnow() - timedelta(days=30)
    
    # Count assignments in last 30 days
    recent_assignments = db.query(func.count(models.AssignedAssets.id)).filter(
        models.AssignedAssets.assigned_on >= last_30_days
    ).scalar()
    
    # Count by status
    status_counts = db.query(
        models.Asset.status,
        func.count(models.Asset.asset_id)
    ).group_by(models.Asset.status).all()
    
    return {
        "recent_assignments_30_days": recent_assignments,
        "asset_status_distribution": {status: count for status, count in status_counts},
        "generated_at": datetime.utcnow()
    }