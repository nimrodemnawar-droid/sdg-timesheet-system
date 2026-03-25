import mysql from 'mysql2/promise';

try {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  console.log('✓ Database connected');
  
  // Create notificationHistory table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS notificationHistory (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      content LONGTEXT NOT NULL,
      eventType ENUM('CHECK_IN','CHECK_OUT','LEAVE_APPROVAL','OVERTIME_ALERT','SYSTEM') NOT NULL,
      eventEntityId INT,
      deliveryStatus ENUM('PENDING','SENT','DELIVERED','FAILED') NOT NULL DEFAULT 'PENDING',
      channels JSON NOT NULL,
      deliveryDetails JSON NOT NULL DEFAULT '{}',
      readAt TIMESTAMP NULL,
      archivedAt TIMESTAMP NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ Created notificationHistory table');
  
  // Create notificationPreferences table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS notificationPreferences (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL UNIQUE,
      enableCheckInNotifications BOOLEAN NOT NULL DEFAULT true,
      enableCheckOutNotifications BOOLEAN NOT NULL DEFAULT true,
      enableLeaveApprovalNotifications BOOLEAN NOT NULL DEFAULT true,
      enableOvertimeAlerts BOOLEAN NOT NULL DEFAULT true,
      quietHoursEnabled BOOLEAN NOT NULL DEFAULT false,
      quietHoursStart VARCHAR(5),
      quietHoursEnd VARCHAR(5),
      quietHoursTimezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
      notificationChannels JSON NOT NULL DEFAULT '{"inApp":true,"email":false,"push":false}',
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('✓ Created notificationPreferences table');
  
  const [tables] = await connection.execute("SHOW TABLES LIKE 'notification%'");
  console.log('✓ Tables created:', tables.map(t => Object.values(t)[0]));
  
  await connection.end();
  console.log('✓ Done');
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
