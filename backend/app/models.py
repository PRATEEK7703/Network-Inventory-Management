from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, DECIMAL, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Headend(Base):
    __tablename__ = "Headend"
    
    headend_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    location = Column(String(200))
    region = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    fdhs = relationship("FDH", back_populates="headend")

class FDH(Base):
    __tablename__ = "FDH"
    
    fdh_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    location = Column(String(200))
    region = Column(String(100))
    max_ports = Column(Integer, default=8)
    headend_id = Column(Integer, ForeignKey("Headend.headend_id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    headend = relationship("Headend", back_populates="fdhs")
    splitters = relationship("Splitter", back_populates="fdh")

class Splitter(Base):
    __tablename__ = "Splitter"
    
    splitter_id = Column(Integer, primary_key=True, autoincrement=True)
    fdh_id = Column(Integer, ForeignKey("FDH.fdh_id"), nullable=False)
    model = Column(String(50))
    port_capacity = Column(Integer, default=8)
    used_ports = Column(Integer, default=0)
    location = Column(String(200))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    fdh = relationship("FDH", back_populates="splitters")
    customers = relationship("Customer", back_populates="splitter")
    fiber_drops = relationship("FiberDropLine", back_populates="splitter")

class Customer(Base):
    __tablename__ = "Customer"
    
    customer_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    address = Column(Text)
    neighborhood = Column(String(100))
    plan = Column(String(50))
    connection_type = Column(Enum('Wired', 'Wireless'), default='Wired')
    status = Column(Enum('Active', 'Inactive', 'Pending'), default='Pending')
    splitter_id = Column(Integer, ForeignKey("Splitter.splitter_id"))
    assigned_port = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    splitter = relationship("Splitter", back_populates="customers")
    assigned_assets = relationship("AssignedAssets", back_populates="customer")
    fiber_drops = relationship("FiberDropLine", back_populates="customer")
    deployment_tasks = relationship("DeploymentTask", back_populates="customer")

class Asset(Base):
    __tablename__ = "Asset"
    
    asset_id = Column(Integer, primary_key=True, autoincrement=True)
    asset_type = Column(Enum('ONT', 'Router', 'Splitter', 'FDH', 'Switch', 'CPE', 'FiberRoll'), nullable=False)
    model = Column(String(100))
    serial_number = Column(String(100), unique=True, nullable=False)
    status = Column(Enum('Available', 'Assigned', 'Faulty', 'Retired'), default='Available')
    location = Column(String(100))
    assigned_to_customer_id = Column(Integer, ForeignKey("Customer.customer_id"), nullable=True)
    assigned_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    assignments = relationship("AssignedAssets", back_populates="asset")

class AssignedAssets(Base):
    __tablename__ = "AssignedAssets"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("Customer.customer_id"), nullable=False)
    asset_id = Column(Integer, ForeignKey("Asset.asset_id"), nullable=False)
    assigned_on = Column(DateTime, default=datetime.utcnow)
    
    customer = relationship("Customer", back_populates="assigned_assets")
    asset = relationship("Asset", back_populates="assignments")

class FiberDropLine(Base):
    __tablename__ = "FiberDropLine"
    
    line_id = Column(Integer, primary_key=True, autoincrement=True)
    from_splitter_id = Column(Integer, ForeignKey("Splitter.splitter_id"), nullable=False)
    to_customer_id = Column(Integer, ForeignKey("Customer.customer_id"), nullable=False)
    length_meters = Column(DECIMAL(6, 2))
    status = Column(Enum('Active', 'Disconnected'), default='Active')
    created_at = Column(DateTime, default=datetime.utcnow)
    
    splitter = relationship("Splitter", back_populates="fiber_drops")
    customer = relationship("Customer", back_populates="fiber_drops")

class Technician(Base):
    __tablename__ = "Technician"
    
    technician_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    contact = Column(String(50))
    region = Column(String(100))
    user_id = Column(Integer, ForeignKey("User.user_id"), nullable=True, unique=True)  # NEW: Link to User
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="technician")  # NEW: Relationship
    deployment_tasks = relationship("DeploymentTask", back_populates="technician")

class DeploymentTask(Base):
    __tablename__ = "DeploymentTask"
    
    task_id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("Customer.customer_id"), nullable=False)
    technician_id = Column(Integer, ForeignKey("Technician.technician_id"))
    status = Column(Enum('Scheduled', 'InProgress', 'Completed', 'Failed'), default='Scheduled')
    scheduled_date = Column(Date)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    customer = relationship("Customer", back_populates="deployment_tasks")
    technician = relationship("Technician", back_populates="deployment_tasks")

class User(Base):
    __tablename__ = "User"
    
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    role = Column(Enum('Planner', 'Technician', 'Admin', 'SupportAgent'), nullable=False)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    audit_logs = relationship("AuditLog", back_populates="user")
    technician = relationship("Technician", back_populates="user", uselist=False)  # NEW: Relationship

class AuditLog(Base):
    __tablename__ = "AuditLog"
    
    log_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("User.user_id"))
    action_type = Column(String(50))
    description = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="audit_logs")