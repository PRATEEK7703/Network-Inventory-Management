from sqlalchemy.orm import Session
from . import models
from .database import SessionLocal
from datetime import datetime

def seed_database():
    db = SessionLocal()
    
    try:
        print("Starting database seeding...")
        
        # Check if data already exists
        existing_headends = db.query(models.Headend).count()
        if existing_headends > 0:
            print("Database already contains data. Skipping seed.")
            return
        
        # Create Headends
        print("Creating Headends...")
        headend1 = models.Headend(
            name="Headend Central",
            location="Main Street, Downtown",
            region="Central"
        )
        headend2 = models.Headend(
            name="Headend North",
            location="North Avenue, Uptown",
            region="North"
        )
        db.add_all([headend1, headend2])
        db.commit()
        print(f"Created Headends: {headend1.name}, {headend2.name}")
        
        # Create FDHs
        print("Creating FDHs...")
        fdh_a = models.FDH(
            name="FDH A",
            location="Zone A, Block 1",
            region="Central",
            max_ports=8,
            headend_id=headend1.headend_id
        )
        fdh_b = models.FDH(
            name="FDH B",
            location="Zone B, Block 2",
            region="Central",
            max_ports=8,
            headend_id=headend1.headend_id
        )
        fdh_c = models.FDH(
            name="FDH C",
            location="Zone C, Block 1",
            region="North",
            max_ports=8,
            headend_id=headend2.headend_id
        )
        db.add_all([fdh_a, fdh_b, fdh_c])
        db.commit()
        print(f"Created FDHs: {fdh_a.name}, {fdh_b.name}, {fdh_c.name}")
        
        # Create Splitters
        print("Creating Splitters...")
        splitter_a1 = models.Splitter(
            fdh_id=fdh_a.fdh_id,
            model="SPL-8x",
            port_capacity=8,
            used_ports=2,
            location="Zone A, Neighborhood 1"
        )
        splitter_a2 = models.Splitter(
            fdh_id=fdh_a.fdh_id,
            model="SPL-8x",
            port_capacity=8,
            used_ports=2,
            location="Zone A, Neighborhood 2"
        )
        splitter_b1 = models.Splitter(
            fdh_id=fdh_b.fdh_id,
            model="SPL-8x",
            port_capacity=8,
            used_ports=1,
            location="Zone B, Neighborhood 1"
        )
        splitter_c1 = models.Splitter(
            fdh_id=fdh_c.fdh_id,
            model="SPL-16x",
            port_capacity=16,
            used_ports=0,
            location="Zone C, Neighborhood 1"
        )
        db.add_all([splitter_a1, splitter_a2, splitter_b1, splitter_c1])
        db.commit()
        print(f"Created 4 Splitters")
        
        # Create Customers
        print("Creating Customers...")
        customer_a11 = models.Customer(
            name="John Doe",
            address="House A1.1, Street 1, Zone A",
            neighborhood="Neighborhood 1",
            plan="100 Mbps Fiber",
            connection_type="Wired",
            status="Active",
            splitter_id=splitter_a1.splitter_id,
            assigned_port=1
        )
        customer_a12 = models.Customer(
            name="Jane Smith",
            address="House A1.2, Street 1, Zone A",
            neighborhood="Neighborhood 1",
            plan="50 Mbps Fiber",
            connection_type="Wired",
            status="Active",
            splitter_id=splitter_a1.splitter_id,
            assigned_port=2
        )
        customer_a21 = models.Customer(
            name="Bob Johnson",
            address="House A2.1, Street 2, Zone A",
            neighborhood="Neighborhood 2",
            plan="200 Mbps Fiber",
            connection_type="Wired",
            status="Active",
            splitter_id=splitter_a2.splitter_id,
            assigned_port=1
        )
        customer_a22 = models.Customer(
            name="Alice Williams",
            address="House A2.2, Street 2, Zone A",
            neighborhood="Neighborhood 2",
            plan="100 Mbps Fiber",
            connection_type="Wired",
            status="Pending",
            splitter_id=splitter_a2.splitter_id,
            assigned_port=2
        )
        customer_b12 = models.Customer(
            name="Charlie Brown",
            address="House B1.2, Street 1, Zone B",
            neighborhood="Neighborhood 1",
            plan="100 Mbps Fiber",
            connection_type="Wired",
            status="Active",
            splitter_id=splitter_b1.splitter_id,
            assigned_port=2
        )
        db.add_all([customer_a11, customer_a12, customer_a21, customer_a22, customer_b12])
        db.commit()
        print(f"Created 5 Customers")
        
        # Create Assets - ONTs
        print("Creating Assets - ONTs...")
        ont_assets = []
        for i in range(1, 11):
            status = "Assigned" if i <= 5 else "Available"
            ont = models.Asset(
                asset_type="ONT",
                model="ONT-X9100",
                serial_number=f"ONT-SN-{1000+i}",
                status=status,
                location="Central Store" if status == "Available" else "Deployed"
            )
            ont_assets.append(ont)
        db.add_all(ont_assets)
        db.commit()
        print(f"Created 10 ONTs")
        
        # Create Assets - Routers
        print("Creating Assets - Routers...")
        router_assets = []
        for i in range(1, 11):
            status = "Assigned" if i <= 5 else "Available"
            router = models.Asset(
                asset_type="Router",
                model="R1-WN1200",
                serial_number=f"RTR-SN-{2000+i}",
                status=status,
                location="Central Store" if status == "Available" else "Deployed"
            )
            router_assets.append(router)
        db.add_all(router_assets)
        db.commit()
        print(f"Created 10 Routers")
        
        # Create Assets - Switches
        print("Creating Assets - Switches...")
        for i in range(1, 6):
            switch = models.Asset(
                asset_type="Switch",
                model="SW-24P",
                serial_number=f"SW-SN-{3000+i}",
                status="Available",
                location="Central Store"
            )
            db.add(switch)
        db.commit()
        print(f"Created 5 Switches")
        
        # Create Assets - Fiber Rolls
        print("Creating Assets - Fiber Rolls...")
        for i in range(1, 4):
            fiber = models.Asset(
                asset_type="FiberRoll",
                model="SM-Fiber-1km",
                serial_number=f"FBR-SN-{4000+i}",
                status="Available",
                location="Warehouse"
            )
            db.add(fiber)
        db.commit()
        print(f"Created 3 Fiber Rolls")
        
        # Assign Assets to Customers
        print("Assigning Assets to Customers...")
        # Customer A1.1
        db.add(models.AssignedAssets(
            customer_id=customer_a11.customer_id,
            asset_id=ont_assets[0].asset_id
        ))
        db.add(models.AssignedAssets(
            customer_id=customer_a11.customer_id,
            asset_id=router_assets[0].asset_id
        ))
        ont_assets[0].assigned_to_customer_id = customer_a11.customer_id
        ont_assets[0].assigned_date = datetime.utcnow()
        router_assets[0].assigned_to_customer_id = customer_a11.customer_id
        router_assets[0].assigned_date = datetime.utcnow()
        
        # Customer A1.2
        db.add(models.AssignedAssets(
            customer_id=customer_a12.customer_id,
            asset_id=ont_assets[1].asset_id
        ))
        db.add(models.AssignedAssets(
            customer_id=customer_a12.customer_id,
            asset_id=router_assets[1].asset_id
        ))
        ont_assets[1].assigned_to_customer_id = customer_a12.customer_id
        ont_assets[1].assigned_date = datetime.utcnow()
        router_assets[1].assigned_to_customer_id = customer_a12.customer_id
        router_assets[1].assigned_date = datetime.utcnow()
        
        # Customer A2.1
        db.add(models.AssignedAssets(
            customer_id=customer_a21.customer_id,
            asset_id=ont_assets[2].asset_id
        ))
        db.add(models.AssignedAssets(
            customer_id=customer_a21.customer_id,
            asset_id=router_assets[2].asset_id
        ))
        ont_assets[2].assigned_to_customer_id = customer_a21.customer_id
        ont_assets[2].assigned_date = datetime.utcnow()
        router_assets[2].assigned_to_customer_id = customer_a21.customer_id
        router_assets[2].assigned_date = datetime.utcnow()
        
        # Customer A2.2 - Pending
        db.add(models.AssignedAssets(
            customer_id=customer_a22.customer_id,
            asset_id=ont_assets[3].asset_id
        ))
        db.add(models.AssignedAssets(
            customer_id=customer_a22.customer_id,
            asset_id=router_assets[3].asset_id
        ))
        ont_assets[3].assigned_to_customer_id = customer_a22.customer_id
        ont_assets[3].assigned_date = datetime.utcnow()
        router_assets[3].assigned_to_customer_id = customer_a22.customer_id
        router_assets[3].assigned_date = datetime.utcnow()
        
        # Customer B1.2
        db.add(models.AssignedAssets(
            customer_id=customer_b12.customer_id,
            asset_id=ont_assets[4].asset_id
        ))
        db.add(models.AssignedAssets(
            customer_id=customer_b12.customer_id,
            asset_id=router_assets[4].asset_id
        ))
        ont_assets[4].assigned_to_customer_id = customer_b12.customer_id
        ont_assets[4].assigned_date = datetime.utcnow()
        router_assets[4].assigned_to_customer_id = customer_b12.customer_id
        router_assets[4].assigned_date = datetime.utcnow()
        
        db.commit()
        print(f"Assigned assets to customers")
        
        # Create Fiber Drop Lines
        print("Creating Fiber Drop Lines...")
        db.add(models.FiberDropLine(
            from_splitter_id=splitter_a1.splitter_id,
            to_customer_id=customer_a11.customer_id,
            length_meters=50.0,
            status="Active"
        ))
        db.add(models.FiberDropLine(
            from_splitter_id=splitter_a1.splitter_id,
            to_customer_id=customer_a12.customer_id,
            length_meters=75.0,
            status="Active"
        ))
        db.add(models.FiberDropLine(
            from_splitter_id=splitter_a2.splitter_id,
            to_customer_id=customer_a21.customer_id,
            length_meters=60.0,
            status="Active"
        ))
        db.add(models.FiberDropLine(
            from_splitter_id=splitter_a2.splitter_id,
            to_customer_id=customer_a22.customer_id,
            length_meters=55.0,
            status="Active"
        ))
        db.add(models.FiberDropLine(
            from_splitter_id=splitter_b1.splitter_id,
            to_customer_id=customer_b12.customer_id,
            length_meters=80.0,
            status="Active"
        ))
        db.commit()
        print(f"Created 5 Fiber Drop Lines")
        
        # Create Users FIRST (before technicians)
        print("Creating Users...")
        import bcrypt
        
        def hash_password(password: str) -> str:
            return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        users = [
            models.User(
                username="admin",
                password_hash=hash_password("admin123"),
                role="Admin"
            ),
            models.User(
                username="planner",
                password_hash=hash_password("planner123"),
                role="Planner"
            ),
            models.User(
                username="tech1",
                password_hash=hash_password("tech123"),
                role="Technician"
            ),
            models.User(
                username="support",
                password_hash=hash_password("support123"),
                role="SupportAgent"
            )
        ]
        db.add_all(users)
        db.commit()
        print(f"Created 4 Users")
        
        # Get the tech1 user for linking
        tech1_user = db.query(models.User).filter(models.User.username == 'tech1').first()
        
        # Create Technicians and LINK to users
        print("Creating Technicians and linking to users...")
        tech1 = models.Technician(
            name="Rajesh Kumar",
            contact="+91-9876543210",
            region="Central",
            user_id=tech1_user.user_id  # ✅ LINK TO USER
        )
        tech2 = models.Technician(
            name="Amit Patel",
            contact="+91-9876543211",
            region="North"
            # No user_id - this technician doesn't have a login
        )
        db.add_all([tech1, tech2])
        db.commit()
        print(f"Created Technicians: {tech1.name} (linked to user), {tech2.name}")
        
        print("\n✅ Database seeding completed successfully!")
        print("\nTest Credentials:")
        print("  Admin: admin/admin123")
        print("  Planner: planner/planner123")
        print("  Technician: tech1/tech123 (linked to Rajesh Kumar)")
        print("  Support: support/support123")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()