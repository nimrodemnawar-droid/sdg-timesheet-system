-- Create notificationPreferences table
CREATE TABLE IF NOT EXISTS notificationPreferences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL UNIQUE,
  enableCheckInNotifications BOOLEAN DEFAULT true,
  enableCheckOutNotifications BOOLEAN DEFAULT true,
  enableLeaveApprovalNotifications BOOLEAN DEFAULT true,
  enableOvertimeAlerts BOOLEAN DEFAULT true,
  quietHoursEnabled BOOLEAN DEFAULT false,
  quietHoursStart TIME,
  quietHoursEnd TIME,
  quietHoursTimezone VARCHAR(50),
  notificationChannels JSON DEFAULT '["in-app", "email"]',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Create notificationHistory table
CREATE TABLE IF NOT EXISTS notificationHistory (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  eventType ENUM('CHECK_IN', 'CHECK_OUT', 'LEAVE_APPROVAL', 'OVERTIME_ALERT', 'SYSTEM') DEFAULT 'SYSTEM',
  title VARCHAR(255) NOT NULL,
  content TEXT,
  deliveryStatus ENUM('PENDING', 'SENT', 'DELIVERED', 'FAILED') DEFAULT 'PENDING',
  channels JSON DEFAULT '["in-app"]',
  readAt TIMESTAMP NULL,
  archivedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId_createdAt (userId, createdAt),
  INDEX idx_deliveryStatus (deliveryStatus)
);

-- Add details column to auditLog if it doesn't exist
ALTER TABLE auditLog ADD COLUMN IF NOT EXISTS details JSON;

-- Create gpsLocations table for GPS tracking
CREATE TABLE IF NOT EXISTS gpsLocations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy FLOAT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active', 'inactive') DEFAULT 'active',
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId_timestamp (userId, timestamp)
);

-- Create leaveBalance table if it doesn't exist
CREATE TABLE IF NOT EXISTS leaveBalance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  leaveType VARCHAR(50) NOT NULL,
  year INT NOT NULL,
  allocatedDays INT DEFAULT 0,
  usedDays INT DEFAULT 0,
  remainingDays INT DEFAULT 0,
  carryoverDays INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_leave_year (userId, leaveType, year),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
