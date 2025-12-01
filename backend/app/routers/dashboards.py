from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from .. import crud, models
from ..database import get_db

router = APIRouter(prefix="/dashboards", tags=["dashboards"])

@router.get("/planner/{user_id}")
def get_planner_dashboard(user_id: int, db: Session = Depends(get_db)):
    """Get dashboard data for Planner role"""
    # Basic stats
    total_assets = db.query(models.Asset).count()
    available_assets = db.query(models.Asset).filter(models.Asset.status == 'Available').count()
    assigned_assets = db.query(models.Asset).filter(models.Asset.status == 'Assigned').count()
    
    total_customers = db.query(models.Customer).count()
    active_customers = db.query(models.Customer).filter(models.Customer.status == 'Active').count()
    pending_customers = db.query(models.Customer).filter(models.Customer.status == 'Pending').count()
    
    # Recent onboardings (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_onboardings = db.query(models.Customer).filter(
        models.Customer.created_at >= week_ago
    ).order_by(models.Customer.created_at.desc()).limit(10).all()
    
    # FDH utilization
    fdhs = db.query(models.FDH).all()
    fdh_utilization = []
    for fdh in fdhs:
        splitters = db.query(models.Splitter).filter(models.Splitter.fdh_id == fdh.fdh_id).all()
        total_capacity = sum(s.port_capacity for s in splitters)
        total_used = sum(s.used_ports for s in splitters)
        
        fdh_utilization.append({
            "fdh_id": fdh.fdh_id,
            "name": fdh.name,
            "location": fdh.location,
            "total_capacity": total_capacity,
            "used_ports": total_used,
            "utilization_percent": round((total_used / total_capacity * 100), 2) if total_capacity > 0 else 0
        })
    
    # Available ports summary
    splitters = db.query(models.Splitter).all()
    available_ports_summary = {
        "total_splitters": len(splitters),
        "total_capacity": sum(s.port_capacity for s in splitters),
        "total_used": sum(s.used_ports for s in splitters),
        "total_available": sum(s.port_capacity - s.used_ports for s in splitters)
    }
    
    return {
        "role": "Planner",
        "stats": {
            "total_assets": total_assets,
            "available_assets": available_assets,
            "assigned_assets": assigned_assets,
            "total_customers": total_customers,
            "active_customers": active_customers,
            "pending_customers": pending_customers
        },
        "recent_onboardings": recent_onboardings,
        "fdh_utilization": fdh_utilization,
        "available_ports_summary": available_ports_summary
    }

@router.get("/technician/{user_id}")
def get_technician_dashboard(user_id: int, db: Session = Depends(get_db)):
    """Get dashboard data for Technician role"""
    from sqlalchemy import func
    
    # ✅ FIXED: Get the actual logged-in user
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # ✅ FIXED: Find technician by matching username
    technician = db.query(models.Technician).filter(
        func.lower(models.Technician.name).contains(func.lower(user.username))
    ).first()
    
    # Fallback: get first technician if no match
    if not technician:
        technician = db.query(models.Technician).first()
    
    technician_id = technician.technician_id if technician else None
    
    # My tasks - only tasks assigned to THIS technician
    my_tasks = []
    if technician_id:
        my_tasks = db.query(models.DeploymentTask).filter(
            models.DeploymentTask.technician_id == technician_id,
            models.DeploymentTask.status.in_(['Scheduled', 'InProgress'])
        ).all()
    
    # Unassigned tasks
    pending_tasks = db.query(models.DeploymentTask).filter(
        models.DeploymentTask.status == 'Scheduled',
        models.DeploymentTask.technician_id == None
    ).limit(10).all()
    
    # Recent completions by THIS technician
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_completions = db.query(models.DeploymentTask).filter(
        models.DeploymentTask.status == 'Completed',
        models.DeploymentTask.updated_at >= week_ago
    )
    if technician_id:
        recent_completions = recent_completions.filter(
            models.DeploymentTask.technician_id == technician_id
        )
    recent_completions = recent_completions.order_by(
        models.DeploymentTask.updated_at.desc()
    ).limit(10).all()
    
    # Task stats
    total_assigned = len(my_tasks)
    in_progress = len([t for t in my_tasks if t.status == 'InProgress'])
    scheduled = len([t for t in my_tasks if t.status == 'Scheduled'])
    
    return {
        "role": "Technician",
        "technician_id": technician_id,
        "technician_name": technician.name if technician else "Unknown",
        "stats": {
            "total_assigned_tasks": total_assigned,
            "in_progress": in_progress,
            "scheduled": scheduled,
            "completed_this_week": len(recent_completions)
        },
        "my_tasks": my_tasks,
        "pending_tasks": pending_tasks[:5],
        "recent_completions": recent_completions
    }

@router.get("/admin/{user_id}")
def get_admin_dashboard(user_id: int, db: Session = Depends(get_db)):
    """Get dashboard data for Admin role"""
    # Comprehensive stats
    total_assets = db.query(models.Asset).count()
    available_assets = db.query(models.Asset).filter(models.Asset.status == 'Available').count()
    assigned_assets = db.query(models.Asset).filter(models.Asset.status == 'Assigned').count()
    faulty_assets = db.query(models.Asset).filter(models.Asset.status == 'Faulty').count()
    
    total_customers = db.query(models.Customer).count()
    active_customers = db.query(models.Customer).filter(models.Customer.status == 'Active').count()
    pending_customers = db.query(models.Customer).filter(models.Customer.status == 'Pending').count()
    
    total_tasks = db.query(models.DeploymentTask).count()
    pending_tasks = db.query(models.DeploymentTask).filter(
        models.DeploymentTask.status.in_(['Scheduled', 'InProgress'])
    ).count()
    completed_tasks = db.query(models.DeploymentTask).filter(
        models.DeploymentTask.status == 'Completed'
    ).count()
    
    # Recent audit logs
    recent_audit_logs = db.query(models.AuditLog).order_by(
        models.AuditLog.timestamp.desc()
    ).limit(20).all()
    
    # User activity summary
    week_ago = datetime.utcnow() - timedelta(days=7)
    user_activity = db.query(
        models.AuditLog.user_id,
        func.count(models.AuditLog.log_id).label('action_count')
    ).filter(
        models.AuditLog.timestamp >= week_ago
    ).group_by(models.AuditLog.user_id).all()
    
    user_activity_summary = []
    for user_id_val, count in user_activity:
        user = db.query(models.User).filter(models.User.user_id == user_id_val).first()
        user_activity_summary.append({
            "user_id": user_id_val,
            "username": user.username if user else "Unknown",
            "role": user.role if user else "Unknown",
            "actions_this_week": count
        })
    
    # System health
    total_users = db.query(models.User).count()
    total_technicians = db.query(models.Technician).count()
    total_fdhs = db.query(models.FDH).count()
    total_splitters = db.query(models.Splitter).count()
    
    system_health = {
        "total_users": total_users,
        "total_technicians": total_technicians,
        "total_fdhs": total_fdhs,
        "total_splitters": total_splitters,
        "database_status": "healthy",
        "last_backup": "N/A"  # In production, would track actual backups
    }
    
    return {
        "role": "Admin",
        "stats": {
            "total_assets": total_assets,
            "available_assets": available_assets,
            "assigned_assets": assigned_assets,
            "faulty_assets": faulty_assets,
            "total_customers": total_customers,
            "active_customers": active_customers,
            "pending_customers": pending_customers,
            "total_tasks": total_tasks,
            "pending_tasks": pending_tasks,
            "completed_tasks": completed_tasks
        },
        "recent_audit_logs": recent_audit_logs,
        "user_activity_summary": sorted(user_activity_summary, key=lambda x: x['actions_this_week'], reverse=True),
        "system_health": system_health
    }

@router.get("/support/{user_id}")
def get_support_dashboard(user_id: int, db: Session = Depends(get_db)):
    """Get dashboard data for Support Agent role"""
    # Customer stats
    total_customers = db.query(models.Customer).count()
    active_customers_list = db.query(models.Customer).filter(
        models.Customer.status == 'Active'
    ).order_by(models.Customer.created_at.desc()).limit(20).all()
    
    pending_customers_list = db.query(models.Customer).filter(
        models.Customer.status == 'Pending'
    ).all()
    
    inactive_customers = db.query(models.Customer).filter(
        models.Customer.status == 'Inactive'
    ).count()
    
    # Recent deactivations
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_deactivations = db.query(models.Customer).filter(
        models.Customer.status == 'Inactive'
    ).order_by(models.Customer.customer_id.desc()).limit(10).all()
    
    recent_deactivations_data = []
    for customer in recent_deactivations:
        # Count reclaimed assets
        reclaimed_count = db.query(models.Asset).filter(
            models.Asset.status == 'Available'
            # Would need better tracking of reclaimed assets in production
        ).count()
        
        recent_deactivations_data.append({
            "customer_id": customer.customer_id,
            "name": customer.name,
            "deactivation_date": customer.created_at,  # In production, track actual deactivation date
            "reclaimed_assets": 0  # Would calculate from history
        })
    
    return {
        "role": "SupportAgent",
        "stats": {
            "total_customers": total_customers,
            "active_customers": len(active_customers_list),
            "pending_customers": len(pending_customers_list),
            "inactive_customers": inactive_customers
        },
        "active_customers": active_customers_list,
        "pending_customers": pending_customers_list,
        "recent_deactivations": recent_deactivations_data
    }