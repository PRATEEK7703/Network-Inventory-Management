from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import crud, schemas, models
from ..database import get_db

router = APIRouter(prefix="/customers", tags=["customers"])

@router.post("/", response_model=schemas.Customer)
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(get_db)):
    """Create a new customer (basic)"""
    return crud.create_customer(db, customer)

@router.post("/onboard", response_model=schemas.Customer)
def onboard_customer(
    customer_data: schemas.CustomerOnboardingCreate,
    db: Session = Depends(get_db)
):
    """Complete customer onboarding with asset assignment"""
    try:
        # Validate splitter and port availability
        splitter = crud.get_splitter(db, customer_data.splitter_id)
        if not splitter:
            raise HTTPException(status_code=404, detail="Splitter not found")
        
        available_ports = crud.get_available_ports(db, customer_data.splitter_id)
        if customer_data.assigned_port not in available_ports:
            raise HTTPException(
                status_code=400,
                detail=f"Port {customer_data.assigned_port} is not available. Available ports: {available_ports}"
            )
        
        # Validate assets if provided
        if customer_data.ont_id:
            ont = crud.get_asset(db, customer_data.ont_id)
            if not ont:
                raise HTTPException(status_code=404, detail=f"ONT with ID {customer_data.ont_id} not found")
            if ont.status != 'Available':
                raise HTTPException(status_code=400, detail=f"ONT {ont.serial_number} is not available (Status: {ont.status})")
            if ont.asset_type != 'ONT':
                raise HTTPException(status_code=400, detail=f"Asset {ont.serial_number} is not an ONT")
        
        if customer_data.router_id:
            router = crud.get_asset(db, customer_data.router_id)
            if not router:
                raise HTTPException(status_code=404, detail=f"Router with ID {customer_data.router_id} not found")
            if router.status != 'Available':
                raise HTTPException(status_code=400, detail=f"Router {router.serial_number} is not available (Status: {router.status})")
            if router.asset_type != 'Router':
                raise HTTPException(status_code=400, detail=f"Asset {router.serial_number} is not a Router")
        
        # Create customer with assignments
        customer = crud.create_customer_with_assignment(db, customer_data)
        return customer
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/", response_model=List[schemas.Customer])
def get_customers(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all customers with optional status filter"""
    return crud.get_customers(db, skip, limit, status)

@router.get("/{customer_id}", response_model=schemas.Customer)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    """Get a specific customer"""
    customer = crud.get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.get("/{customer_id}/details")
def get_customer_details(customer_id: int, db: Session = Depends(get_db)):
    """Get customer with assigned assets and splitter info"""
    customer = crud.get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get assigned assets
    assigned_assets = crud.get_customer(db, customer_id).assigned_assets
    assets = [assignment.asset for assignment in assigned_assets]
    
    # Get splitter info
    splitter = None
    if customer.splitter_id:
        splitter = crud.get_splitter(db, customer.splitter_id)
    
    return {
        "customer": customer,
        "assets": assets,
        "splitter": splitter
    }

@router.put("/{customer_id}", response_model=schemas.Customer)
def update_customer(
    customer_id: int,
    customer_data: schemas.CustomerUpdate,
    db: Session = Depends(get_db)
):
    """Update customer information"""
    try:
        customer = crud.update_customer(db, customer_id, customer_data)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        return customer
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/splitter/{splitter_id}/available-ports")
def get_available_ports_for_splitter(splitter_id: int, db: Session = Depends(get_db)):
    """Get available ports on a splitter"""
    splitter = crud.get_splitter(db, splitter_id)
    if not splitter:
        raise HTTPException(status_code=404, detail="Splitter not found")
    
    available_ports = crud.get_available_ports(db, splitter_id)
    
    return {
        "splitter_id": splitter_id,
        "total_capacity": splitter.port_capacity,
        "used_ports": splitter.used_ports,
        "available_ports": available_ports
    }

@router.post("/{customer_id}/assign-assets")
def assign_assets_to_customer(
    customer_id: int,
    ont_id: int,
    router_id: int,
    db: Session = Depends(get_db)
):
    """Assign ONT and Router to an existing customer"""
    try:
        customer = crud.assign_customer_assets(db, customer_id, ont_id, router_id)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        return {"message": "Assets assigned successfully", "customer": customer}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# ✅ NEW ENDPOINTS FOR DELETE/DEACTIVATE
# ========================================

@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    """
    Delete a customer permanently and reclaim all assigned assets
    
    This will:
    - Delete fiber drop lines (MUST BE FIRST to avoid IntegrityError)
    - Delete the customer record
    - Reclaim all assigned assets (set to Available)
    - Delete all deployment tasks for this customer
    - Delete all asset assignment records
    """
    
    # Get customer
    customer = db.query(models.Customer).filter(
        models.Customer.customer_id == customer_id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    try:
        # Step 0: Delete fiber drop lines FIRST (prevents IntegrityError)
        fiber_lines_deleted = 0
        if hasattr(models, 'FiberDropLine'):
            try:
                fiber_lines = db.query(models.FiberDropLine).filter(
                    models.FiberDropLine.to_customer_id == customer_id
                ).all()
                fiber_lines_deleted = len(fiber_lines)
                for line in fiber_lines:
                    db.delete(line)
            except Exception as fiber_error:
                # If FiberDropLine model doesn't exist, continue
                print(f"Note: Could not delete fiber lines: {fiber_error}")
        
        # Step 1: Reclaim all assigned assets
        assigned_assets = db.query(models.AssignedAssets).filter(
            models.AssignedAssets.customer_id == customer_id
        ).all()
        
        reclaimed_count = 0
        for assignment in assigned_assets:
            asset = db.query(models.Asset).filter(
                models.Asset.asset_id == assignment.asset_id
            ).first()
            if asset:
                asset.status = 'Available'
                asset.assigned_to_customer_id = None
                asset.assigned_date = None
                reclaimed_count += 1
        
        # Step 2: Delete assigned assets records
        db.query(models.AssignedAssets).filter(
            models.AssignedAssets.customer_id == customer_id
        ).delete()
        
        # Step 3: Delete deployment tasks
        tasks_deleted = db.query(models.DeploymentTask).filter(
            models.DeploymentTask.customer_id == customer_id
        ).delete()
        
        # Step 4: Free up splitter port
        if customer.splitter_id and customer.assigned_port:
            splitter = db.query(models.Splitter).filter(
                models.Splitter.splitter_id == customer.splitter_id
            ).first()
            if splitter and splitter.used_ports > 0:
                splitter.used_ports -= 1
        
        # Step 5: Delete customer (LAST)
        db.delete(customer)
        db.commit()
        
        return {
            "message": "Customer deleted successfully",
            "customer_id": customer_id,
            "customer_name": customer.name,
            "reclaimed_assets": reclaimed_count,
            "deleted_tasks": tasks_deleted,
            "deleted_fiber_lines": fiber_lines_deleted
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting customer: {str(e)}"
        )

@router.post("/{customer_id}/deactivate")
def deactivate_customer(
    customer_id: int,
    reason: Optional[str] = Query(None, description="Reason for deactivation"),
    db: Session = Depends(get_db)
):
    """
    Deactivate a customer and reclaim assets
    
    This will:
    - Set customer status to Inactive
    - Reclaim all assigned assets (set to Available)
    - Keep customer record for history
    """
    
    customer = db.query(models.Customer).filter(
        models.Customer.customer_id == customer_id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    if customer.status == 'Inactive':
        raise HTTPException(status_code=400, detail="Customer is already inactive")
    
    try:
        # Update customer status
        customer.status = 'Inactive'
        
        # Reclaim assets
        assigned_assets = db.query(models.AssignedAssets).filter(
            models.AssignedAssets.customer_id == customer_id
        ).all()
        
        reclaimed_count = 0
        reclaimed_asset_list = []
        
        for assignment in assigned_assets:
            asset = db.query(models.Asset).filter(
                models.Asset.asset_id == assignment.asset_id
            ).first()
            if asset:
                asset.status = 'Available'
                asset.assigned_to_customer_id = None
                reclaimed_count += 1
                reclaimed_asset_list.append({
                    "asset_id": asset.asset_id,
                    "type": asset.asset_type,
                    "serial": asset.serial_number
                })
        
        # Free up splitter port
        if customer.splitter_id and customer.assigned_port:
            splitter = db.query(models.Splitter).filter(
                models.Splitter.splitter_id == customer.splitter_id
            ).first()
            if splitter and splitter.used_ports > 0:
                splitter.used_ports -= 1
        
        db.commit()
        
        return {
            "message": "Customer deactivated successfully",
            "customer_id": customer_id,
            "customer_name": customer.name,
            "reason": reason,
            "reclaimed_assets": reclaimed_count,
            "reclaimed_asset_details": reclaimed_asset_list
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error deactivating customer: {str(e)}"
        )

@router.post("/{customer_id}/activate")
def activate_customer(customer_id: int, db: Session = Depends(get_db)):
    """
    Reactivate a customer (sets status to Pending)
    
    This will:
    - Set customer status to Pending
    - Customer will need a new deployment task to become Active
    """
    
    customer = db.query(models.Customer).filter(
        models.Customer.customer_id == customer_id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    if customer.status == 'Active':
        raise HTTPException(status_code=400, detail="Customer is already active")
    
    if customer.status == 'Pending':
        raise HTTPException(status_code=400, detail="Customer is already pending")
    
    try:
        # Set to Pending - will need new deployment task
        customer.status = 'Pending'
        db.commit()
        
        return {
            "message": "Customer reactivated (status: Pending)",
            "customer_id": customer_id,
            "customer_name": customer.name,
            "note": "Create a deployment task to activate service"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error activating customer: {str(e)}"
        )

@router.get("/status/pending")
def get_pending_customers(db: Session = Depends(get_db)):
    """
    Get all pending customers with their details
    
    Returns customers with status='Pending' along with:
    - Assigned assets
    - Deployment task status (if exists)
    """
    
    customers = db.query(models.Customer).filter(
        models.Customer.status == 'Pending'
    ).all()
    
    result = []
    for customer in customers:
        # Get assigned assets
        assigned_assets = db.query(models.AssignedAssets).filter(
            models.AssignedAssets.customer_id == customer.customer_id
        ).all()
        assets = [assignment.asset for assignment in assigned_assets]
        
        # Get deployment task if exists
        task = db.query(models.DeploymentTask).filter(
            models.DeploymentTask.customer_id == customer.customer_id
        ).order_by(models.DeploymentTask.created_at.desc()).first()
        
        result.append({
            "customer": customer,
            "assets": assets,
            "deployment_task": task,
            "has_task": task is not None,
            "task_status": task.status if task else None,
            "waiting_for": "deployment_task" if not task else f"task_{task.status.lower()}"
        })
    
    return {
        "total_pending": len(result),
        "pending_customers": result
    }