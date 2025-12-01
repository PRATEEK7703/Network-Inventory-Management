from sqlalchemy.orm import Session
from sqlalchemy import and_
from . import models, schemas
from typing import List, Optional
from datetime import datetime

# Asset CRUD Operations
def create_asset(db: Session, asset: schemas.AssetCreate):
    db_asset = models.Asset(**asset.dict())
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset

def get_assets(
    db: Session, 
    skip: int = 0, 
    limit: int = 100,
    asset_type: Optional[str] = None,
    status: Optional[str] = None,
    location: Optional[str] = None
):
    query = db.query(models.Asset)
    
    if asset_type:
        query = query.filter(models.Asset.asset_type == asset_type)
    if status:
        query = query.filter(models.Asset.status == status)
    if location:
        query = query.filter(models.Asset.location.like(f"%{location}%"))
    
    return query.offset(skip).limit(limit).all()

def get_asset(db: Session, asset_id: int):
    return db.query(models.Asset).filter(models.Asset.asset_id == asset_id).first()

def get_asset_by_serial(db: Session, serial_number: str):
    return db.query(models.Asset).filter(models.Asset.serial_number == serial_number).first()

def update_asset(db: Session, asset_id: int, asset_update: schemas.AssetUpdate):
    db_asset = get_asset(db, asset_id)
    if db_asset:
        update_data = asset_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_asset, key, value)
        
        if 'assigned_to_customer_id' in update_data and update_data['assigned_to_customer_id']:
            db_asset.assigned_date = datetime.utcnow()
            db_asset.status = 'Assigned'
        
        db.commit()
        db.refresh(db_asset)
    return db_asset

def delete_asset(db: Session, asset_id: int):
    db_asset = get_asset(db, asset_id)
    if db_asset:
        db.delete(db_asset)
        db.commit()
        return True
    return False

def get_asset_history(db: Session, asset_id: int):
    return db.query(models.AssignedAssets).filter(
        models.AssignedAssets.asset_id == asset_id
    ).all()

# Headend CRUD
def create_headend(db: Session, headend: schemas.HeadendCreate):
    db_headend = models.Headend(**headend.dict())
    db.add(db_headend)
    db.commit()
    db.refresh(db_headend)
    return db_headend

def get_headends(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Headend).offset(skip).limit(limit).all()

def get_headend(db: Session, headend_id: int):
    return db.query(models.Headend).filter(models.Headend.headend_id == headend_id).first()

# FDH CRUD
def create_fdh(db: Session, fdh: schemas.FDHCreate):
    db_fdh = models.FDH(**fdh.dict())
    db.add(db_fdh)
    db.commit()
    db.refresh(db_fdh)
    return db_fdh

def get_fdhs(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.FDH).offset(skip).limit(limit).all()

def get_fdh(db: Session, fdh_id: int):
    return db.query(models.FDH).filter(models.FDH.fdh_id == fdh_id).first()

# Splitter CRUD
def create_splitter(db: Session, splitter: schemas.SplitterCreate):
    db_splitter = models.Splitter(**splitter.dict())
    db.add(db_splitter)
    db.commit()
    db.refresh(db_splitter)
    return db_splitter

def get_splitters(db: Session, fdh_id: Optional[int] = None, skip: int = 0, limit: int = 100):
    query = db.query(models.Splitter)
    if fdh_id:
        query = query.filter(models.Splitter.fdh_id == fdh_id)
    return query.offset(skip).limit(limit).all()

def get_splitter(db: Session, splitter_id: int):
    return db.query(models.Splitter).filter(models.Splitter.splitter_id == splitter_id).first()

# Customer CRUD
def create_customer(db: Session, customer: schemas.CustomerCreate):
    db_customer = models.Customer(**customer.dict())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

def get_customers(db: Session, skip: int = 0, limit: int = 100, status: Optional[str] = None):
    query = db.query(models.Customer)
    if status:
        query = query.filter(models.Customer.status == status)
    return query.offset(skip).limit(limit).all()

def get_customer(db: Session, customer_id: int):
    return db.query(models.Customer).filter(models.Customer.customer_id == customer_id).first()

# Topology Functions
def get_customer_topology(db: Session, customer_id: int):
    customer = get_customer(db, customer_id)
    if not customer:
        return None
    
    result = {
        "customer": {
            "id": customer.customer_id,
            "name": customer.name,
            "status": customer.status,
            "address": customer.address
        }
    }
    
    # Get assigned assets (ONT and Router)
    assigned_assets = db.query(models.AssignedAssets).filter(
        models.AssignedAssets.customer_id == customer_id
    ).all()
    
    for assignment in assigned_assets:
        asset = assignment.asset
        asset_data = {
            "id": asset.asset_id,
            "type": asset.asset_type,
            "model": asset.model,
            "serial": asset.serial_number,
            "status": asset.status
        }
        if asset.asset_type == "ONT":
            result["ont"] = asset_data
        elif asset.asset_type == "Router":
            result["router"] = asset_data
    
    # Get Splitter
    if customer.splitter_id:
        splitter = get_splitter(db, customer.splitter_id)
        if splitter:
            result["splitter"] = {
                "id": splitter.splitter_id,
                "model": splitter.model,
                "port": customer.assigned_port,
                "capacity": splitter.port_capacity,
                "used": splitter.used_ports
            }
            
            # Get FDH
            if splitter.fdh_id:
                fdh = get_fdh(db, splitter.fdh_id)
                if fdh:
                    result["fdh"] = {
                        "id": fdh.fdh_id,
                        "name": fdh.name,
                        "location": fdh.location,
                        "region": fdh.region
                    }
                    
                    # Get Headend
                    if fdh.headend_id:
                        headend = get_headend(db, fdh.headend_id)
                        if headend:
                            result["headend"] = {
                                "id": headend.headend_id,
                                "name": headend.name,
                                "location": headend.location,
                                "region": headend.region
                            }
    
    return result

def get_fdh_topology(db: Session, fdh_id: int):
    fdh = get_fdh(db, fdh_id)
    if not fdh:
        return None
    
    result = {
        "fdh": {
            "id": fdh.fdh_id,
            "name": fdh.name,
            "location": fdh.location,
            "region": fdh.region,
            "max_ports": fdh.max_ports
        },
        "splitters": []
    }
    
    splitters = get_splitters(db, fdh_id=fdh_id)
    total_customers = 0
    
    for splitter in splitters:
        customers = db.query(models.Customer).filter(
            models.Customer.splitter_id == splitter.splitter_id
        ).all()
        
        total_customers += len(customers)
        
        splitter_data = {
            "id": splitter.splitter_id,
            "model": splitter.model,
            "port_capacity": splitter.port_capacity,
            "used_ports": splitter.used_ports,
            "location": splitter.location,
            "customers": [
                {
                    "id": c.customer_id,
                    "name": c.name,
                    "status": c.status,
                    "port": c.assigned_port
                } for c in customers
            ]
        }
        result["splitters"].append(splitter_data)
    
    result["total_customers"] = total_customers
    return result

def search_device_by_serial(db: Session, serial_number: str):
    asset = get_asset_by_serial(db, serial_number)
    if not asset:
        return None
    
    result = {
        "asset": {
            "id": asset.asset_id,
            "type": asset.asset_type,
            "model": asset.model,
            "serial": asset.serial_number,
            "status": asset.status,
            "location": asset.location
        }
    }
    
    # If assigned, get customer topology
    if asset.assigned_to_customer_id:
        result["customer_topology"] = get_customer_topology(db, asset.assigned_to_customer_id)
    
    # Get assignment history
    history = get_asset_history(db, asset.asset_id)
    result["history"] = [
        {
            "customer_id": h.customer_id,
            "assigned_on": h.assigned_on
        } for h in history
    ]
    
    return result

def update_customer(db: Session, customer_id: int, customer_update: schemas.CustomerUpdate):
    db_customer = get_customer(db, customer_id)
    if db_customer:
        update_data = customer_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_customer, key, value)
        db.commit()
        db.refresh(db_customer)
    return db_customer

def delete_customer(db: Session, customer_id: int):
    db_customer = get_customer(db, customer_id)
    if db_customer:
        db.delete(db_customer)
        db.commit()
        return True
    return False

def assign_customer_assets(db: Session, customer_id: int, ont_id: int, router_id: int):
    """Assign ONT and Router to a customer"""
    customer = get_customer(db, customer_id)
    if not customer:
        return None
    
    # Get and validate assets
    ont = get_asset(db, ont_id)
    router = get_asset(db, router_id)
    
    if not ont or ont.asset_type != 'ONT' or ont.status != 'Available':
        raise ValueError("ONT not available")
    if not router or router.asset_type != 'Router' or router.status != 'Available':
        raise ValueError("Router not available")
    
    # Update assets
    ont.status = 'Assigned'
    ont.assigned_to_customer_id = customer_id
    ont.assigned_date = datetime.utcnow()
    
    router.status = 'Assigned'
    router.assigned_to_customer_id = customer_id
    router.assigned_date = datetime.utcnow()
    
    # Create assignment records
    db.add(models.AssignedAssets(
        customer_id=customer_id,
        asset_id=ont_id,
        assigned_on=datetime.utcnow()
    ))
    db.add(models.AssignedAssets(
        customer_id=customer_id,
        asset_id=router_id,
        assigned_on=datetime.utcnow()
    ))
    
    db.commit()
    db.refresh(customer)
    return customer

# FIXED: Now filters by customer status to exclude Inactive customers
def get_available_ports(db: Session, splitter_id: int):
    """
    Get available ports for a splitter.
    Only considers Active and Pending customers as occupying ports.
    Inactive customers' ports are released and available for reassignment.
    """
    splitter = get_splitter(db, splitter_id)
    if not splitter:
        return []
    
    # Get occupied ports - ONLY from Active and Pending customers
    occupied_ports = db.query(models.Customer.assigned_port).filter(
        models.Customer.splitter_id == splitter_id,
        models.Customer.assigned_port.isnot(None),
        models.Customer.status.in_(['Active', 'Pending'])  # FIX: Added status filter
    ).all()
    
    occupied = {port[0] for port in occupied_ports}
    available = [i for i in range(1, splitter.port_capacity + 1) if i not in occupied]
    
    return available

# FIXED: Now only counts Active and Pending customers
def update_splitter_used_ports(db: Session, splitter_id: int):
    """
    Update the used_ports count for a splitter.
    Only counts Active and Pending customers.
    """
    splitter = get_splitter(db, splitter_id)
    if splitter:
        # FIX: Only count Active and Pending customers
        count = db.query(models.Customer).filter(
            models.Customer.splitter_id == splitter_id,
            models.Customer.assigned_port.isnot(None),
            models.Customer.status.in_(['Active', 'Pending'])  # FIX: Added status filter
        ).count()
        splitter.used_ports = count
        db.commit()
        db.refresh(splitter)
    return splitter

def create_customer_with_assignment(db: Session, customer_data: schemas.CustomerOnboardingCreate):
    """Create customer with splitter assignment and assets in one transaction"""
    try:
        # Create customer
        db_customer = models.Customer(
            name=customer_data.name,
            address=customer_data.address,
            neighborhood=customer_data.neighborhood,
            plan=customer_data.plan,
            connection_type=customer_data.connection_type,
            status='Pending',
            splitter_id=customer_data.splitter_id,
            assigned_port=customer_data.assigned_port
        )
        db.add(db_customer)
        db.flush()  # Get customer_id without committing
        
        # Assign assets if provided
        if customer_data.ont_id and customer_data.router_id:
            ont = get_asset(db, customer_data.ont_id)
            router = get_asset(db, customer_data.router_id)
            
            if not ont or ont.status != 'Available':
                raise ValueError("ONT not available")
            if not router or router.status != 'Available':
                raise ValueError("Router not available")
            
            # Update assets
            ont.status = 'Assigned'
            ont.assigned_to_customer_id = db_customer.customer_id
            ont.assigned_date = datetime.utcnow()
            
            router.status = 'Assigned'
            router.assigned_to_customer_id = db_customer.customer_id
            router.assigned_date = datetime.utcnow()
            
            # Create assignment records
            db.add(models.AssignedAssets(
                customer_id=db_customer.customer_id,
                asset_id=customer_data.ont_id,
                assigned_on=datetime.utcnow()
            ))
            db.add(models.AssignedAssets(
                customer_id=db_customer.customer_id,
                asset_id=customer_data.router_id,
                assigned_on=datetime.utcnow()
            ))
        
        # Create fiber drop line if specified
        if customer_data.fiber_length_meters:
            db.add(models.FiberDropLine(
                from_splitter_id=customer_data.splitter_id,
                to_customer_id=db_customer.customer_id,
                length_meters=customer_data.fiber_length_meters,
                status='Active'
            ))
        
        # Update splitter used ports
        update_splitter_used_ports(db, customer_data.splitter_id)
        
        db.commit()
        db.refresh(db_customer)
        return db_customer
        
    except Exception as e:
        db.rollback()
        raise e

def reassign_asset(db: Session, asset_id: int, new_customer_id: int):
    """Reassign an asset from one customer to another"""
    asset = get_asset(db, asset_id)
    if not asset:
        raise ValueError("Asset not found")
    
    new_customer = get_customer(db, new_customer_id)
    if not new_customer:
        raise ValueError("Customer not found")
    
    # Store old assignment for history
    old_customer_id = asset.assigned_to_customer_id
    
    # Update asset
    asset.assigned_to_customer_id = new_customer_id
    asset.assigned_date = datetime.utcnow()
    asset.status = 'Assigned'
    
    # Create new assignment record
    db.add(models.AssignedAssets(
        customer_id=new_customer_id,
        asset_id=asset_id,
        assigned_on=datetime.utcnow()
    ))
    
    db.commit()
    db.refresh(asset)
    
    return {
        "asset": asset,
        "old_customer_id": old_customer_id,
        "new_customer_id": new_customer_id
    }

def replace_faulty_asset(db: Session, old_asset_id: int, new_asset_id: int):
    """Replace a faulty asset with a working one"""
    old_asset = get_asset(db, old_asset_id)
    new_asset = get_asset(db, new_asset_id)
    
    if not old_asset or not new_asset:
        raise ValueError("Asset not found")
    
    if new_asset.status != 'Available':
        raise ValueError("New asset is not available")
    
    customer_id = old_asset.assigned_to_customer_id
    
    if not customer_id:
        raise ValueError("Old asset is not assigned to any customer")
    
    # Mark old asset as faulty and unassign
    old_asset.status = 'Faulty'
    old_asset.assigned_to_customer_id = None
    
    # Assign new asset
    new_asset.status = 'Assigned'
    new_asset.assigned_to_customer_id = customer_id
    new_asset.assigned_date = datetime.utcnow()
    
    # Create assignment record for new asset
    db.add(models.AssignedAssets(
        customer_id=customer_id,
        asset_id=new_asset_id,
        assigned_on=datetime.utcnow()
    ))
    
    db.commit()
    
    return {
        "old_asset": old_asset,
        "new_asset": new_asset,
        "customer_id": customer_id
    }

def get_asset_lifecycle_details(db: Session, asset_id: int):
    """Get complete lifecycle details of an asset"""
    asset = get_asset(db, asset_id)
    if not asset:
        return None
    
    # Get assignment history
    assignments = db.query(models.AssignedAssets).filter(
        models.AssignedAssets.asset_id == asset_id
    ).order_by(models.AssignedAssets.assigned_on.desc()).all()
    
    # Get customer details for each assignment
    history = []
    for assignment in assignments:
        customer = get_customer(db, assignment.customer_id)
        history.append({
            "customer_id": assignment.customer_id,
            "customer_name": customer.name if customer else "Unknown",
            "assigned_on": assignment.assigned_on,
            "duration_days": (datetime.utcnow() - assignment.assigned_on).days if assignment.assigned_on else 0
        })
    
    return {
        "asset": asset,
        "total_assignments": len(assignments),
        "assignment_history": history,
        "current_assignment": history[0] if history and asset.assigned_to_customer_id else None
    }

def reclaim_customer_assets(db: Session, customer_id: int):
    """Reclaim all assets from a customer and mark them as available"""
    customer = get_customer(db, customer_id)
    if not customer:
        raise ValueError("Customer not found")
    
    # Get all assigned assets
    assignments = db.query(models.AssignedAssets).filter(
        models.AssignedAssets.customer_id == customer_id
    ).all()
    
    reclaimed_assets = []
    for assignment in assignments:
        asset = assignment.asset
        asset.status = 'Available'
        asset.assigned_to_customer_id = None
        asset.assigned_date = None
        reclaimed_assets.append({
            "asset_id": asset.asset_id,
            "asset_type": asset.asset_type,
            "serial_number": asset.serial_number
        })
    
    # Update customer status
    customer.status = 'Inactive'
    
    # Update splitter used ports if applicable
    if customer.splitter_id:
        update_splitter_used_ports(db, customer.splitter_id)
    
    db.commit()
    
    return {
        "customer_id": customer_id,
        "customer_name": customer.name,
        "reclaimed_assets": reclaimed_assets,
        "total_reclaimed": len(reclaimed_assets)
    }

def retire_asset(db: Session, asset_id: int, reason: str = None):
    """Retire an asset permanently"""
    asset = get_asset(db, asset_id)
    if not asset:
        raise ValueError("Asset not found")
    
    # If assigned, unassign first
    if asset.assigned_to_customer_id:
        asset.assigned_to_customer_id = None
        asset.assigned_date = None
    
    asset.status = 'Retired'
    
    # Could add a retirement log here if needed
    db.commit()
    db.refresh(asset)
    
    return asset

def get_asset_utilization_stats(db: Session):
    """Get asset utilization statistics"""
    from sqlalchemy import func, case
    
    # Get counts by type and status
    stats = db.query(
        models.Asset.asset_type,
        models.Asset.status,
        func.count(models.Asset.asset_id).label('count')
    ).group_by(models.Asset.asset_type, models.Asset.status).all()
    
    # Calculate utilization rate
    utilization = {}
    for asset_type, status, count in stats:
        if asset_type not in utilization:
            utilization[asset_type] = {
                'Available': 0,
                'Assigned': 0,
                'Faulty': 0,
                'Retired': 0,
                'total': 0,
                'utilization_rate': 0
            }
        utilization[asset_type][status] = count
        utilization[asset_type]['total'] += count
    
    # Calculate utilization rates
    for asset_type in utilization:
        total = utilization[asset_type]['total']
        assigned = utilization[asset_type]['Assigned']
        if total > 0:
            utilization[asset_type]['utilization_rate'] = round((assigned / total) * 100, 2)
    
    return utilization

def get_assets_due_for_maintenance(db: Session, days_threshold: int = 365):
    """Get assets that haven't been serviced/checked in a while"""
    from datetime import timedelta
    
    threshold_date = datetime.utcnow() - timedelta(days=days_threshold)
    
    # Get assets assigned before threshold date
    assets = db.query(models.Asset).filter(
        models.Asset.assigned_date < threshold_date,
        models.Asset.status == 'Assigned'
    ).all()
    
    return assets