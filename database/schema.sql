-- Create Database
CREATE DATABASE IF NOT EXISTS network_inventory;
USE network_inventory;

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS AuditLog;
DROP TABLE IF EXISTS DeploymentTask;
DROP TABLE IF EXISTS FiberDropLine;
DROP TABLE IF EXISTS AssignedAssets;
DROP TABLE IF EXISTS Asset;
DROP TABLE IF EXISTS Customer;
DROP TABLE IF EXISTS Splitter;
DROP TABLE IF EXISTS FDH;
DROP TABLE IF EXISTS Headend;
DROP TABLE IF EXISTS Technician;
DROP TABLE IF EXISTS User;

-- Headend Table
CREATE TABLE Headend (
    headend_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    region VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- FDH (Fiber Distribution Hub) Table
CREATE TABLE FDH (
    fdh_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    region VARCHAR(100),
    max_ports INT DEFAULT 8,
    headend_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (headend_id) REFERENCES Headend(headend_id)
);

-- Splitter Table
CREATE TABLE Splitter (
    splitter_id INT PRIMARY KEY AUTO_INCREMENT,
    fdh_id INT NOT NULL,
    model VARCHAR(50),
    port_capacity INT DEFAULT 8,
    used_ports INT DEFAULT 0,
    location VARCHAR(200),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fdh_id) REFERENCES FDH(fdh_id)
);

-- Customer Table
CREATE TABLE Customer (
    customer_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    neighborhood VARCHAR(100),
    plan VARCHAR(50),
    connection_type ENUM('Wired', 'Wireless') DEFAULT 'Wired',
    status ENUM('Active', 'Inactive', 'Pending') DEFAULT 'Pending',
    splitter_id INT,
    assigned_port INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (splitter_id) REFERENCES Splitter(splitter_id)
);

-- Asset Table
CREATE TABLE Asset (
    asset_id INT PRIMARY KEY AUTO_INCREMENT,
    asset_type ENUM('ONT', 'Router', 'Splitter', 'FDH', 'Switch', 'CPE', 'FiberRoll') NOT NULL,
    model VARCHAR(100),
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    status ENUM('Available', 'Assigned', 'Faulty', 'Retired') DEFAULT 'Available',
    location VARCHAR(100),
    assigned_to_customer_id INT NULL,
    assigned_date DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_asset_type (asset_type),
    INDEX idx_status (status),
    INDEX idx_serial (serial_number)
);

-- AssignedAssets Table (Junction table for many-to-many relationship)
CREATE TABLE AssignedAssets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    asset_id INT NOT NULL,
    assigned_on DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES Customer(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (asset_id) REFERENCES Asset(asset_id) ON DELETE CASCADE,
    UNIQUE KEY unique_assignment (customer_id, asset_id)
);

-- FiberDropLine Table
CREATE TABLE FiberDropLine (
    line_id INT PRIMARY KEY AUTO_INCREMENT,
    from_splitter_id INT NOT NULL,
    to_customer_id INT NOT NULL,
    length_meters DECIMAL(6,2),
    status ENUM('Active', 'Disconnected') DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_splitter_id) REFERENCES Splitter(splitter_id),
    FOREIGN KEY (to_customer_id) REFERENCES Customer(customer_id)
);

-- Technician Table
CREATE TABLE Technician (
    technician_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    contact VARCHAR(50),
    region VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- DeploymentTask Table
CREATE TABLE DeploymentTask (
    task_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    technician_id INT,
    status ENUM('Scheduled', 'InProgress', 'Completed', 'Failed') DEFAULT 'Scheduled',
    scheduled_date DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES Customer(customer_id),
    FOREIGN KEY (technician_id) REFERENCES Technician(technician_id)
);

-- User Table (For Role-based Access)
CREATE TABLE User (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    role ENUM('Planner', 'Technician', 'Admin', 'SupportAgent') NOT NULL,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AuditLog Table
CREATE TABLE AuditLog (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action_type VARCHAR(50),
    description TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES User(user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_customer_status ON Customer(status);
CREATE INDEX idx_customer_splitter ON Customer(splitter_id);
CREATE INDEX idx_asset_customer ON Asset(assigned_to_customer_id);
CREATE INDEX idx_deployment_status ON DeploymentTask(status);
CREATE INDEX idx_deployment_tech ON DeploymentTask(technician_id);