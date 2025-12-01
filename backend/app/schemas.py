from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from enum import Enum

# Enums
class ConnectionType(str, Enum):
    Wired = "Wired"
    Wireless = "Wireless"

class CustomerStatus(str, Enum):
    Active = "Active"
    Inactive = "Inactive"
    Pending = "Pending"

class AssetType(str, Enum):
    ONT = "ONT"
    Router = "Router"
    Splitter = "Splitter"
    FDH = "FDH"
    Switch = "Switch"
    CPE = "CPE"
    FiberRoll = "FiberRoll"

class AssetStatus(str, Enum):
    Available = "Available"
    Assigned = "Assigned"
    Faulty = "Faulty"
    Retired = "Retired"

class UserRole(str, Enum):
    Planner = "Planner"
    Technician = "Technician"
    Admin = "Admin"
    SupportAgent = "SupportAgent"

# Asset Schemas
class AssetBase(BaseModel):
    asset_type: AssetType
    model: str
    serial_number: str
    status: AssetStatus = AssetStatus.Available
    location: Optional[str] = None

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    model: Optional[str] = None
    status: Optional[AssetStatus] = None
    location: Optional[str] = None
    assigned_to_customer_id: Optional[int] = None

class Asset(AssetBase):
    asset_id: int
    assigned_to_customer_id: Optional[int] = None
    assigned_date: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Headend Schemas
class HeadendBase(BaseModel):
    name: str
    location: Optional[str] = None
    region: Optional[str] = None

class HeadendCreate(HeadendBase):
    pass

class Headend(HeadendBase):
    headend_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# FDH Schemas
class FDHBase(BaseModel):
    name: str
    location: Optional[str] = None
    region: Optional[str] = None
    max_ports: int = 8
    headend_id: Optional[int] = None

class FDHCreate(FDHBase):
    pass

class FDH(FDHBase):
    fdh_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Splitter Schemas
class SplitterBase(BaseModel):
    fdh_id: int
    model: Optional[str] = None
    port_capacity: int = 8
    used_ports: int = 0
    location: Optional[str] = None

class SplitterCreate(SplitterBase):
    pass

class Splitter(SplitterBase):
    splitter_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Customer Schemas
class CustomerBase(BaseModel):
    name: str
    address: Optional[str] = None
    neighborhood: Optional[str] = None
    plan: Optional[str] = None
    connection_type: ConnectionType = ConnectionType.Wired

class CustomerCreate(CustomerBase):
    pass

class Customer(CustomerBase):
    customer_id: int
    status: CustomerStatus
    splitter_id: Optional[int] = None
    assigned_port: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Topology Response Schemas
class TopologyNode(BaseModel):
    id: int
    name: str
    type: str
    status: Optional[str] = None
    children: List['TopologyNode'] = []

class CustomerTopology(BaseModel):
    customer: dict
    ont: Optional[dict] = None
    router: Optional[dict] = None
    splitter: Optional[dict] = None
    fdh: Optional[dict] = None
    headend: Optional[dict] = None

class FDHTopology(BaseModel):
    fdh: dict
    splitters: List[dict]
    total_customers: int

# User Schemas
class UserBase(BaseModel):
    username: str
    role: UserRole

class UserCreate(UserBase):
    password: str

class User(UserBase):
    user_id: int
    last_login: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    neighborhood: Optional[str] = None
    plan: Optional[str] = None
    connection_type: Optional[ConnectionType] = None
    status: Optional[CustomerStatus] = None
    splitter_id: Optional[int] = None
    assigned_port: Optional[int] = None

# Customer Onboarding Schema
class CustomerOnboardingCreate(BaseModel):
    name: str
    address: str
    neighborhood: str
    plan: str
    connection_type: ConnectionType = ConnectionType.Wired
    splitter_id: int
    assigned_port: int
    ont_id: Optional[int] = None
    router_id: Optional[int] = None
    fiber_length_meters: Optional[float] = None

# Deployment Task Schemas
class TaskStatus(str, Enum):
    Scheduled = "Scheduled"
    InProgress = "InProgress"
    Completed = "Completed"
    Failed = "Failed"

class DeploymentTaskBase(BaseModel):
    customer_id: int
    technician_id: Optional[int] = None
    scheduled_date: Optional[date] = None
    notes: Optional[str] = None

class DeploymentTaskCreate(DeploymentTaskBase):
    pass

class DeploymentTaskUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    technician_id: Optional[int] = None
    scheduled_date: Optional[date] = None
    notes: Optional[str] = None

class DeploymentTask(DeploymentTaskBase):
    task_id: int
    status: TaskStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DeploymentTaskDetail(DeploymentTask):
    customer: Optional[Customer] = None
    technician: Optional['Technician'] = None

# Technician Schemas
class TechnicianBase(BaseModel):
    name: str
    contact: Optional[str] = None
    region: Optional[str] = None

class TechnicianCreate(TechnicianBase):
    pass

class Technician(TechnicianBase):
    technician_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Customer with Assets Detail
class CustomerDetail(Customer):
    assigned_assets: List[Asset] = []
    splitter: Optional[Splitter] = None

    class Config:
        from_attributes = True

# Add these schemas to your existing schemas.py file

# Audit Log Schemas
class AuditLogBase(BaseModel):
    user_id: Optional[int] = None
    action_type: str
    description: str

class AuditLogCreate(AuditLogBase):
    pass

class AuditLog(AuditLogBase):
    log_id: int
    timestamp: datetime

    class Config:
        from_attributes = True

class AuditLogWithUser(AuditLog):
    user: Optional[User] = None

    class Config:
        from_attributes = True

# User Login Schema
class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    user_id: int
    username: str
    role: UserRole
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

# Dashboard Stats Schema
class DashboardStats(BaseModel):
    total_assets: int
    available_assets: int
    assigned_assets: int
    faulty_assets: int
    total_customers: int
    active_customers: int
    pending_customers: int
    total_tasks: int
    pending_tasks: int
    completed_tasks: int

# Role-specific Dashboard Data
class PlannerDashboard(BaseModel):
    stats: DashboardStats
    recent_onboardings: List[Customer]
    available_ports_summary: dict
    fdh_utilization: dict

class TechnicianDashboard(BaseModel):
    stats: dict
    my_tasks: List[DeploymentTask]
    pending_tasks: List[DeploymentTask]
    recent_completions: List[DeploymentTask]

class AdminDashboard(BaseModel):
    stats: DashboardStats
    recent_audit_logs: List[AuditLog]
    user_activity_summary: dict
    system_health: dict

class SupportDashboard(BaseModel):
    stats: dict
    active_customers: List[Customer]
    pending_customers: List[Customer]
    recent_deactivations: List[dict]

# Enable forward references
TopologyNode.model_rebuild()