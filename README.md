# Network Inventory & Deployment Management

A comprehensive full-stack application designed for managing telecom network assets, visualizing network topology, handling customer onboarding, and orchestrating deployment workflows.

## 🚀 Features

- **Asset Inventory Management**: Track and manage lifecycle of network assets including ONTs, Routers, Splitters, FDHs, Switches, CPEs, and Fiber Rolls.
- **Network Topology Visualizer**: Interactive visualization of the network hierarchy from Headend to Customer (Headend -> FDH -> Splitter -> Customer).
- **Customer Onboarding**: Manage customer details, service plans, and connection types (Wired/Wireless).
- **Deployment Workflow**: Schedule, assign, and track deployment tasks with field technicians.
- **Lifecycle Management**: Monitor asset status (Available, Assigned, Faulty, Retired) and history.
- **Role-Based Access Control (RBAC)**: Secure access for Planners, Technicians, Admins, and Support Agents.
- **Audit Logs**: Comprehensive tracking of user actions for security and compliance.
- **Dashboards**: Role-specific dashboards providing relevant insights and metrics.
- **AI Assistant**: Integrated AI support for querying network data and assisting with tasks.

## 🛠️ Tech Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) - High performance, easy to learn, fast to code, ready for production.
- **Database**: MySQL with [SQLAlchemy](https://www.sqlalchemy.org/) ORM.
- **Authentication**: JWT based auth with `bcrypt` for password hashing.
- **Validation**: [Pydantic](https://docs.pydantic.dev/) models.

### Frontend
- **Framework**: [React](https://react.dev/) with [Vite](https://vitejs.dev/).
- **Styling**: Modern CSS/Tailwind (inferred).
- **Icons**: [Lucide React](https://lucide.dev/).
- **Charts**: [Recharts](https://recharts.org/) for data visualization.
- **HTTP Client**: [Axios](https://axios-http.com/).

## 📋 Prerequisites

- Python 3.9+
- Node.js 18+
- MySQL Server

## ⚙️ Installation & Setup

### Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    python -m venv venv
    # Windows
    .\venv\Scripts\activate
    # macOS/Linux
    source venv/bin/activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure Environment Variables:**
    Create a `.env` file in the `backend` directory (or rely on defaults).
    ```env
    DATABASE_URL=mysql+pymysql://{USERNAME}:{PASSWORD}@localhost:{PORT}/{DATABASE NAME}
    SECRET_KEY=your_secret_key
    ALGORITHM=HS256
    ACCESS_TOKEN_EXPIRE_MINUTES=30
    ```

5.  **Run the server:**
    ```bash
    uvicorn app.main:app --reload
    ```
    The API will be available at `http://localhost:8000`.

### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

## 📖 API Documentation

Once the backend server is running, you can access the interactive API documentation at:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## 📂 Project Structure

```
network-inventory/
├── backend/
│   ├── app/
│   │   ├── routers/      # API route handlers
│   │   ├── models.py     # Database models
│   │   ├── schemas.py    # Pydantic schemas
│   │   ├── crud.py       # Database operations
│   │   ├── database.py   # Database connection
│   │   └── main.py       # Application entry point
│   ├── requirements.txt
│   └── venv/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 🤝 Contributing

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'Add some amazing feature'`).
4.  Push to the branch (`git push origin feature/amazing-feature`).
5.  Open a Pull Request.
