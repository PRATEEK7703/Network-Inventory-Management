from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from .. import schemas, models
from ..database import get_db

router = APIRouter(prefix="/audit", tags=["audit"])

@router.post("/log", response_model=schemas.AuditLog)
def create_audit_log(log: schemas.AuditLogCreate, db: Session = Depends(get_db)):
    """Create a new audit log entry"""
    db_log = models.AuditLog(**log.dict())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

@router.get("/logs")
def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = Query(None),
    action_type: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get audit logs with optional filters"""
    query = db.query(models.AuditLog)
    
    if user_id:
        query = query.filter(models.AuditLog.user_id == user_id)
    if action_type:
        query = query.filter(models.AuditLog.action_type == action_type)
    if start_date:
        query = query.filter(models.AuditLog.timestamp >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(models.AuditLog.timestamp <= datetime.fromisoformat(end_date))
    
    total = query.count()
    logs = query.order_by(models.AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    
    # Enrich with user information
    enriched_logs = []
    for log in logs:
        user = db.query(models.User).filter(models.User.user_id == log.user_id).first()
        enriched_logs.append({
            "log_id": log.log_id,
            "user_id": log.user_id,
            "username": user.username if user else "Unknown",
            "user_role": user.role if user else "Unknown",
            "action_type": log.action_type,
            "description": log.description,
            "timestamp": log.timestamp
        })
    
    return {
        "total": total,
        "logs": enriched_logs
    }

@router.get("/logs/{log_id}", response_model=schemas.AuditLog)
def get_audit_log(log_id: int, db: Session = Depends(get_db)):
    """Get a specific audit log entry"""
    log = db.query(models.AuditLog).filter(models.AuditLog.log_id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return log

@router.get("/user/{user_id}/activity")
def get_user_activity(
    user_id: int,
    days: int = Query(30, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """Get activity summary for a specific user"""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    logs = db.query(models.AuditLog).filter(
        models.AuditLog.user_id == user_id,
        models.AuditLog.timestamp >= start_date
    ).all()
    
    # Group by action type
    from collections import defaultdict
    action_counts = defaultdict(int)
    for log in logs:
        action_counts[log.action_type] += 1
    
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    
    return {
        "user_id": user_id,
        "username": user.username if user else "Unknown",
        "period_days": days,
        "total_actions": len(logs),
        "actions_by_type": dict(action_counts),
        "recent_activities": logs[:10]  # Last 10 activities
    }

@router.get("/stats/summary")
def get_audit_summary(
    days: int = Query(7, description="Number of days to analyze"),
    db: Session = Depends(get_db)
):
    """Get audit statistics summary"""
    from sqlalchemy import func
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Count by action type
    action_stats = db.query(
        models.AuditLog.action_type,
        func.count(models.AuditLog.log_id).label('count')
    ).filter(
        models.AuditLog.timestamp >= start_date
    ).group_by(models.AuditLog.action_type).all()
    
    # Count by user
    user_stats = db.query(
        models.AuditLog.user_id,
        func.count(models.AuditLog.log_id).label('count')
    ).filter(
        models.AuditLog.timestamp >= start_date
    ).group_by(models.AuditLog.user_id).all()
    
    # Enrich user stats with usernames
    enriched_user_stats = []
    for user_id, count in user_stats:
        user = db.query(models.User).filter(models.User.user_id == user_id).first()
        enriched_user_stats.append({
            "user_id": user_id,
            "username": user.username if user else "Unknown",
            "action_count": count
        })
    
    return {
        "period_days": days,
        "total_logs": sum(count for _, count in action_stats),
        "actions_by_type": {action: count for action, count in action_stats},
        "most_active_users": sorted(enriched_user_stats, key=lambda x: x['action_count'], reverse=True)[:5]
    }

@router.delete("/logs/{log_id}")
def delete_audit_log(log_id: int, db: Session = Depends(get_db)):
    """Delete an audit log entry (Admin only - use with caution)"""
    log = db.query(models.AuditLog).filter(models.AuditLog.log_id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")
    
    db.delete(log)
    db.commit()
    return {"message": "Audit log deleted successfully"}

@router.get("/export")
def export_audit_logs(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Export audit logs as JSON for reporting"""
    query = db.query(models.AuditLog)
    
    if start_date:
        query = query.filter(models.AuditLog.timestamp >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(models.AuditLog.timestamp <= datetime.fromisoformat(end_date))
    
    logs = query.order_by(models.AuditLog.timestamp.desc()).all()
    
    # Enrich with user information
    export_data = []
    for log in logs:
        user = db.query(models.User).filter(models.User.user_id == log.user_id).first()
        export_data.append({
            "log_id": log.log_id,
            "timestamp": log.timestamp.isoformat(),
            "user_id": log.user_id,
            "username": user.username if user else "Unknown",
            "user_role": user.role if user else "Unknown",
            "action_type": log.action_type,
            "description": log.description
        })
    
    return {
        "export_date": datetime.utcnow().isoformat(),
        "total_logs": len(export_data),
        "logs": export_data
    }