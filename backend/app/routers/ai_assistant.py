from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from .. import models
from ..database import get_db
from datetime import datetime
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/ai-assistant", tags=["ai-assistant"])

# Initialize OpenAI client
# Get API key from environment variable
OPENAI_API =os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API) if OPENAI_API else None

# Request/Response Models
class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None
    role: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    suggestions: Optional[list] = None
    data: Optional[dict] = None

def get_system_context(db: Session, role: str):
    """Get current system state as context for AI"""
    
    # Get statistics
    total_customers = db.query(models.Customer).count()
    active_customers = db.query(models.Customer).filter(
        models.Customer.status == 'Active'
    ).count()
    pending_customers = db.query(models.Customer).filter(
        models.Customer.status == 'Pending'
    ).count()
    
    total_assets = db.query(models.Asset).count()
    available_onts = db.query(models.Asset).filter(
        models.Asset.asset_type == 'ONT',
        models.Asset.status == 'Available'
    ).count()
    available_routers = db.query(models.Asset).filter(
        models.Asset.asset_type == 'Router',
        models.Asset.status == 'Available'
    ).count()
    
    pending_tasks = db.query(models.DeploymentTask).filter(
        models.DeploymentTask.status.in_(['Scheduled', 'InProgress'])
    ).count()
    
    # Get FDH information
    fdhs = db.query(models.FDH).all()
    fdh_info = []
    for fdh in fdhs:
        splitters = db.query(models.Splitter).filter(
            models.Splitter.fdh_id == fdh.fdh_id
        ).all()
        total_capacity = sum(s.port_capacity for s in splitters)
        used_ports = sum(s.used_ports for s in splitters)
        fdh_info.append({
            "id": fdh.fdh_id,
            "name": fdh.name,
            "location": fdh.location,
            "total_capacity": total_capacity,
            "used_ports": used_ports,
            "available_ports": total_capacity - used_ports
        })
    
    # Get recent tasks
    recent_tasks = db.query(models.DeploymentTask).filter(
        models.DeploymentTask.status.in_(['InProgress', 'Failed'])
    ).order_by(models.DeploymentTask.created_at.desc()).limit(5).all()
    
    task_info = []
    for task in recent_tasks:
        customer = db.query(models.Customer).filter(
            models.Customer.customer_id == task.customer_id
        ).first()
        task_info.append({
            "task_id": task.task_id,
            "customer_name": customer.name if customer else "Unknown",
            "status": task.status,
            "scheduled_date": str(task.scheduled_date)
        })
    
    context = f"""
You are an AI assistant for a Network Inventory & Deployment Management System for a telecom/ISP company.

CURRENT SYSTEM STATUS:
- Total Customers: {total_customers} (Active: {active_customers}, Pending: {pending_customers})
- Available Assets: {available_onts} ONTs, {available_routers} Routers
- Pending Deployment Tasks: {pending_tasks}

FDH (Fiber Distribution Hubs):
{chr(10).join([f"- {fdh['name']} ({fdh['location']}): {fdh['available_ports']}/{fdh['total_capacity']} ports available" for fdh in fdh_info])}

Recent Tasks:
{chr(10).join([f"- Task #{task['task_id']}: {task['customer_name']} - {task['status']}" for task in task_info]) if task_info else "- No active tasks"}

USER ROLE: {role}

Role-specific guidance:
- Planner: Focus on capacity planning, asset allocation, customer onboarding
- Technician: Focus on installation, troubleshooting, task completion
- Admin: Focus on system optimization, performance, user management
- SupportAgent: Focus on customer service, issue resolution, deactivation

Provide helpful, technical, and actionable responses. Use the actual data above in your responses.
Format responses with clear sections using **bold** for headers and bullet points for lists.
"""
    return context

def get_openai_response(message: str, system_context: str, conversation_history: list = None):
    """Get response from OpenAI GPT"""
    
    if not client:
        return {
            "response": "⚠️ OpenAI API key not configured. Please set OPENAI_API environment variable.",
            "suggestions": ["Configure OpenAI API key", "Use test mode"],
            "data": None
        }
    
    try:
        messages = [
            {"role": "system", "content": system_context}
        ]
        
        # Add conversation history if provided
        if conversation_history:
            messages.extend(conversation_history)
        
        # Add current message
        messages.append({"role": "user", "content": message})
        
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # or "gpt-4" for better quality
            messages=messages,
            temperature=0.7,
            max_tokens=800,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0
        )
        
        ai_response = response.choices[0].message.content
        
        # Generate suggestions based on response
        suggestions = []
        if "ont" in message.lower() or "router" in message.lower():
            suggestions = ["View full inventory", "Check FDH capacity", "Create onboarding"]
        elif "customer" in message.lower():
            suggestions = ["View customer details", "Check deployment status", "View topology"]
        elif "troubleshoot" in message.lower() or "issue" in message.lower():
            suggestions = ["View task details", "Contact technician", "Check equipment"]
        elif "status" in message.lower():
            suggestions = ["View detailed metrics", "Generate report", "Check alerts"]
        
        return {
            "response": ai_response,
            "suggestions": suggestions,
            "data": None
        }
        
    except Exception as e:
        return {
            "response": f"❌ Error calling OpenAI API: {str(e)}\n\nPlease check your API key and internet connection.",
            "suggestions": ["Check API key", "Verify connection"],
            "data": None
        }

@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest, db: Session = Depends(get_db)):
    """
    AI Assistant chat endpoint using real OpenAI GPT
    """
    
    # Get system context
    system_context = get_system_context(db, request.role or "Planner")
    
    # Get AI response
    result = get_openai_response(request.message, system_context)
    
    return ChatResponse(**result)

@router.get("/suggestions/{role}")
async def get_role_suggestions(role: str, db: Session = Depends(get_db)):
    """Get AI suggestions specific to user role"""
    
    suggestions = {
        "Planner": [
            {
                "title": "Asset Availability Check",
                "query": "What ONTs and Routers are available for deployment?",
                "category": "assets"
            },
            {
                "title": "Capacity Planning",
                "query": "Which FDH has the most available capacity?",
                "category": "planning"
            },
            {
                "title": "Customer Overview",
                "query": "Show me the status of pending customers",
                "category": "customers"
            }
        ],
        "Technician": [
            {
                "title": "Installation Guide",
                "query": "What's the step-by-step process for ONT installation?",
                "category": "deployment"
            },
            {
                "title": "Troubleshooting Help",
                "query": "The ONT power light is blinking red, what should I check?",
                "category": "troubleshooting"
            },
            {
                "title": "Task Overview",
                "query": "What are my pending installation tasks?",
                "category": "tasks"
            }
        ],
        "Admin": [
            {
                "title": "System Status",
                "query": "Give me a complete system health overview",
                "category": "monitoring"
            },
            {
                "title": "Performance Analysis",
                "query": "How can I optimize database performance?",
                "category": "optimization"
            },
            {
                "title": "Capacity Forecast",
                "query": "Based on current usage, when will we need more assets?",
                "category": "planning"
            }
        ],
        "SupportAgent": [
            {
                "title": "Customer Service Guide",
                "query": "How do I handle a customer service disconnection request?",
                "category": "support"
            },
            {
                "title": "Common Issues",
                "query": "What are the most common customer complaints and solutions?",
                "category": "support"
            },
            {
                "title": "Pending Customers",
                "query": "Why are customers in pending status and what should I do?",
                "category": "customers"
            }
        ]
    }
    
    return {
        "role": role,
        "suggestions": suggestions.get(role, suggestions["Planner"])
    }

@router.get("/quick-actions/{role}")
async def get_quick_actions(role: str, db: Session = Depends(get_db)):
    """Get quick action items based on current system state"""
    
    actions = []
    
    if role in ["Planner", "Admin"]:
        # Check for low asset inventory
        ont_count = db.query(models.Asset).filter(
            models.Asset.asset_type == 'ONT',
            models.Asset.status == 'Available'
        ).count()
        
        if ont_count < 5:
            actions.append({
                "type": "warning",
                "title": "Low ONT Inventory",
                "message": f"Only {ont_count} ONTs available. Consider reordering.",
                "action": "View Inventory"
            })
        
        router_count = db.query(models.Asset).filter(
            models.Asset.asset_type == 'Router',
            models.Asset.status == 'Available'
        ).count()
        
        if router_count < 5:
            actions.append({
                "type": "warning",
                "title": "Low Router Inventory",
                "message": f"Only {router_count} Routers available. Consider reordering.",
                "action": "View Inventory"
            })
    
    if role in ["Planner", "Admin"]:
        # Check for pending customers
        pending_count = db.query(models.Customer).filter(
            models.Customer.status == 'Pending'
        ).count()
        
        if pending_count > 0:
            actions.append({
                "type": "info",
                "title": "Pending Customers",
                "message": f"{pending_count} customers waiting for deployment.",
                "action": "View Pending"
            })
    
    if role in ["Technician", "Planner", "Admin"]:
        # Check for overdue tasks
        overdue_tasks = db.query(models.DeploymentTask).filter(
            models.DeploymentTask.status == 'Scheduled',
            models.DeploymentTask.scheduled_date < datetime.now().date()
        ).count()
        
        if overdue_tasks > 0:
            actions.append({
                "type": "alert",
                "title": "Overdue Tasks",
                "message": f"{overdue_tasks} deployment tasks are overdue.",
                "action": "View Tasks"
            })
    
    return {
        "role": role,
        "actions": actions,
        "timestamp": datetime.utcnow()
    }

@router.get("/health")
async def health_check():
    """Check if AI service is configured and working"""
    return {
        "status": "healthy" if client else "unconfigured",
        "api_configured": bool(OPENAI_API),
        "model": "gpt-4o-mini" if client else None,
        "message": "AI service ready" if client else "OpenAI API key not configured"
    }