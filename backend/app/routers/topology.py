from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/topology", tags=["topology"])

@router.get("/customer/{customer_id}")
def get_customer_topology(customer_id: int, db: Session = Depends(get_db)):
    """Get full network hierarchy for a customer"""
    topology = crud.get_customer_topology(db, customer_id)
    if not topology:
        raise HTTPException(status_code=404, detail="Customer not found")
    return topology

@router.get("/fdh/{fdh_id}")
def get_fdh_topology(fdh_id: int, db: Session = Depends(get_db)):
    """Get FDH topology with all splitters and customers"""
    topology = crud.get_fdh_topology(db, fdh_id)
    if not topology:
        raise HTTPException(status_code=404, detail="FDH not found")
    return topology

@router.get("/search/device/{serial_number}")
def search_device(serial_number: str, db: Session = Depends(get_db)):
    """Search device by serial number and get its full context"""
    result = crud.search_device_by_serial(db, serial_number)
    if not result:
        raise HTTPException(status_code=404, detail="Device not found")
    return result

# Headend endpoints
@router.get("/headends", response_model=List[schemas.Headend])
def get_headends(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all headends"""
    return crud.get_headends(db, skip, limit)

@router.get("/headends/{headend_id}", response_model=schemas.Headend)
def get_headend(headend_id: int, db: Session = Depends(get_db)):
    """Get a specific headend"""
    headend = crud.get_headend(db, headend_id)
    if not headend:
        raise HTTPException(status_code=404, detail="Headend not found")
    return headend

@router.post("/headends", response_model=schemas.Headend)
def create_headend(headend: schemas.HeadendCreate, db: Session = Depends(get_db)):
    """Create a new headend"""
    return crud.create_headend(db, headend)

# FDH endpoints
@router.get("/fdhs", response_model=List[schemas.FDH])
def get_fdhs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all FDHs"""
    return crud.get_fdhs(db, skip, limit)

@router.get("/fdhs/{fdh_id}", response_model=schemas.FDH)
def get_fdh(fdh_id: int, db: Session = Depends(get_db)):
    """Get a specific FDH"""
    fdh = crud.get_fdh(db, fdh_id)
    if not fdh:
        raise HTTPException(status_code=404, detail="FDH not found")
    return fdh

@router.post("/fdhs", response_model=schemas.FDH)
def create_fdh(fdh: schemas.FDHCreate, db: Session = Depends(get_db)):
    """Create a new FDH"""
    return crud.create_fdh(db, fdh)

# Splitter endpoints
@router.get("/splitters", response_model=List[schemas.Splitter])
def get_splitters(
    fdh_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all splitters, optionally filtered by FDH"""
    return crud.get_splitters(db, fdh_id, skip, limit)

@router.get("/splitters/{splitter_id}", response_model=schemas.Splitter)
def get_splitter(splitter_id: int, db: Session = Depends(get_db)):
    """Get a specific splitter"""
    splitter = crud.get_splitter(db, splitter_id)
    if not splitter:
        raise HTTPException(status_code=404, detail="Splitter not found")
    return splitter

@router.post("/splitters", response_model=schemas.Splitter)
def create_splitter(splitter: schemas.SplitterCreate, db: Session = Depends(get_db)):
    """Create a new splitter"""
    return crud.create_splitter(db, splitter)

# Customer endpoints
@router.get("/customers", response_model=List[schemas.Customer])
def get_customers(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    db: Session = Depends(get_db)
):
    """Get all customers"""
    return crud.get_customers(db, skip, limit, status)

@router.get("/customers/{customer_id}", response_model=schemas.Customer)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    """Get a specific customer"""
    customer = crud.get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.post("/customers", response_model=schemas.Customer)
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(get_db)):
    """Create a new customer"""
    return crud.create_customer(db, customer)