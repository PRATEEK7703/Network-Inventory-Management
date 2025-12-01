from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import assets, topology, customers, deployment, lifecycle, auth, audit, dashboards,ai_assistant
from .database import engine, Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Network Inventory & Deployment Management API",
    description="API for managing telecom network assets and deployments",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(assets.router)
app.include_router(topology.router)
app.include_router(customers.router)
app.include_router(deployment.router)
app.include_router(lifecycle.router)
app.include_router(auth.router)
app.include_router(audit.router)
app.include_router(dashboards.router)
app.include_router(ai_assistant.router)

@app.get("/")
def read_root():
    return {
        "message": "Network Inventory & Deployment Management API",
        "version": "2.0.0",
        "docs": "/docs",
        "sprints_completed": [
            "Sprint 0 - Setup & Foundation",
            "Sprint 1 - Asset Inventory Management",
            "Sprint 2 - Network Topology & Hierarchy Visualizer",
            "Sprint 3 - Customer Onboarding",
            "Sprint 4 - Deployment Workflow",
            "Sprint 5 - Asset Lifecycle, Deactivation, and Reuse",
            "Sprint 6 - Role-Based Dashboards, Audit Logs"
        ]
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "2.0.0"}