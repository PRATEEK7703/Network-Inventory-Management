from fastapi import APIRouter, Depends, HTTPException, Query, Body  # ✅ Body imported here
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from pydantic import BaseModel  # ✅ BaseModel imported here
from .. import crud, schemas, models
from ..database import get_db

router = APIRouter(prefix="/deployment", tags=["deployment"])

# ✅ REQUEST MODELS FOR JSON BODY
class TaskNotesRequest(BaseModel):
    notes: str

class TaskStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

# Technician Endpoints
@router.post("/technicians", response_model=schemas.Technician)
def create_technician(technician: schemas.TechnicianCreate, db: Session = Depends(get_db)):
    """Create a new technician"""
    db_tech = models.Technician(**technician.dict())
    db.add(db_tech)
    db.commit()
    db.refresh(db_tech)
    return db_tech

@router.get("/technicians", response_model=List[schemas.Technician])
def get_technicians(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all technicians"""
    return db.query(models.Technician).offset(skip).limit(limit).all()

@router.get("/technicians/{technician_id}", response_model=schemas.Technician)
def get_technician(technician_id: int, db: Session = Depends(get_db)):
    """Get a specific technician"""
    tech = db.query(models.Technician).filter(
        models.Technician.technician_id == technician_id
    ).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician not found")
    return tech

@router.patch("/technicians/{technician_id}/link-user/{user_id}")
def link_technician_to_user(technician_id: int, user_id: int, db: Session = Depends(get_db)):
    """Link a technician to a user account"""
    tech = db.query(models.Technician).filter(
        models.Technician.technician_id == technician_id
    ).first()
    
    if not tech:
        raise HTTPException(status_code=404, detail="Technician not found")
    
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role != 'Technician':
        raise HTTPException(status_code=400, detail="User must have Technician role")
    
    tech.user_id = user_id
    db.commit()
    db.refresh(tech)
    
    return {"message": "Technician linked to user successfully", "technician": tech}

# Deployment Task Endpoints
@router.post("/tasks", response_model=schemas.DeploymentTask)
def create_deployment_task(
    task: schemas.DeploymentTaskCreate,
    db: Session = Depends(get_db)
):
    """Create a new deployment task"""
    customer = crud.get_customer(db, task.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    if task.technician_id:
        tech = db.query(models.Technician).filter(
            models.Technician.technician_id == task.technician_id
        ).first()
        if not tech:
            raise HTTPException(status_code=404, detail="Technician not found")
    
    db_task = models.DeploymentTask(**task.dict())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.get("/tasks", response_model=List[schemas.DeploymentTask])
def get_deployment_tasks(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None),
    technician_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all deployment tasks with optional filters"""
    query = db.query(models.DeploymentTask)
    
    if status:
        query = query.filter(models.DeploymentTask.status == status)
    if technician_id:
        query = query.filter(models.DeploymentTask.technician_id == technician_id)
    
    return query.offset(skip).limit(limit).all()

@router.get("/tasks/{task_id}")
def get_deployment_task_details(task_id: int, db: Session = Depends(get_db)):
    """Get deployment task with customer and technician details"""
    task = db.query(models.DeploymentTask).filter(
        models.DeploymentTask.task_id == task_id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    customer = crud.get_customer(db, task.customer_id)
    
    assigned_assets = db.query(models.AssignedAssets).filter(
        models.AssignedAssets.customer_id == task.customer_id
    ).all()
    assets = [assignment.asset for assignment in assigned_assets]
    
    splitter = None
    fdh = None
    if customer.splitter_id:
        splitter = crud.get_splitter(db, customer.splitter_id)
        if splitter and splitter.fdh_id:
            fdh = crud.get_fdh(db, splitter.fdh_id)
    
    technician = None
    if task.technician_id:
        technician = db.query(models.Technician).filter(
            models.Technician.technician_id == task.technician_id
        ).first()
    
    return {
        "task": task,
        "customer": customer,
        "assets": assets,
        "splitter": splitter,
        "fdh": fdh,
        "technician": technician
    }

@router.patch("/tasks/{task_id}", response_model=schemas.DeploymentTask)
def update_deployment_task(
    task_id: int,
    task_update: schemas.DeploymentTaskUpdate,
    db: Session = Depends(get_db)
):
    """Update deployment task status or details"""
    task = db.query(models.DeploymentTask).filter(
        models.DeploymentTask.task_id == task_id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)
    
    task.updated_at = datetime.utcnow()
    
    if task_update.status == "Completed":
        customer = crud.get_customer(db, task.customer_id)
        if customer:
            customer.status = "Active"
    
    db.commit()
    db.refresh(task)
    return task

@router.patch("/tasks/{task_id}/status")
def update_task_status(
    task_id: int,
    status_update: TaskStatusUpdate = Body(...),  # ✅ FIXED
    db: Session = Depends(get_db)
):
    """Quick status update endpoint for technicians"""
    task = db.query(models.DeploymentTask).filter(
        models.DeploymentTask.task_id == task_id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    valid_statuses = ['Scheduled', 'InProgress', 'Completed', 'Failed']
    if status_update.status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    task.status = status_update.status
    task.updated_at = datetime.utcnow()
    
    if status_update.notes:
        timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        if task.notes:
            task.notes = f"{task.notes}\n\n[{timestamp}] Status: {status_update.status}\n{status_update.notes}"
        else:
            task.notes = f"[{timestamp}] Status: {status_update.status}\n{status_update.notes}"
    
    if status_update.status == "Completed":
        customer = crud.get_customer(db, task.customer_id)
        if customer:
            customer.status = "Active"
    
    db.commit()
    db.refresh(task)
    
    return {
        "message": "Task status updated successfully",
        "task": task
    }

@router.post("/tasks/{task_id}/notes")
def add_task_notes(
    task_id: int,
    notes_request: TaskNotesRequest = Body(...),  # ✅ FIXED
    db: Session = Depends(get_db)
):
    """Add or append notes to a deployment task"""
    task = db.query(models.DeploymentTask).filter(
        models.DeploymentTask.task_id == task_id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    if task.notes:
        task.notes = f"{task.notes}\n\n[{timestamp}]\n{notes_request.notes}"
    else:
        task.notes = f"[{timestamp}]\n{notes_request.notes}"
    
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    
    return {"message": "Notes added successfully", "task": task}

@router.delete("/tasks/{task_id}")
def delete_deployment_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a deployment task"""
    task = db.query(models.DeploymentTask).filter(
        models.DeploymentTask.task_id == task_id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully"}

@router.get("/technicians/{technician_id}/tasks")
def get_technician_tasks(
    technician_id: int,
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all tasks assigned to a specific technician"""
    query = db.query(models.DeploymentTask).filter(
        models.DeploymentTask.technician_id == technician_id
    )
    
    if status:
        query = query.filter(models.DeploymentTask.status == status)
    
    tasks = query.all()
    
    result = []
    for task in tasks:
        customer = crud.get_customer(db, task.customer_id)
        result.append({
            "task": task,
            "customer": customer
        })
    
    return result

@router.get("/my-tasks/{user_id}")
def get_my_tasks(user_id: int, db: Session = Depends(get_db)):
    """Get tasks for the logged-in technician user"""
    technician = db.query(models.Technician).filter(
        models.Technician.user_id == user_id
    ).first()
    
    if not technician:
        raise HTTPException(
            status_code=404, 
            detail="No technician profile found for this user. Please contact admin to link your account."
        )
    
    tasks = db.query(models.DeploymentTask).filter(
        models.DeploymentTask.technician_id == technician.technician_id
    ).all()
    
    result = []
    for task in tasks:
        customer = crud.get_customer(db, task.customer_id)
        result.append({
            "task": task,
            "customer": customer,
            "technician": technician
        })
    
    return result

@router.get("/stats/summary")
def get_deployment_stats(db: Session = Depends(get_db)):
    """Get deployment statistics"""
    from sqlalchemy import func
    
    stats = db.query(
        models.DeploymentTask.status,
        func.count(models.DeploymentTask.task_id).label('count')
    ).group_by(models.DeploymentTask.status).all()
    
    summary = {status: 0 for status in ["Scheduled", "InProgress", "Completed", "Failed"]}
    for status, count in stats:
        summary[status] = count
    
    total = sum(summary.values())
    
    return {
        "total_tasks": total,
        "by_status": summary
    }