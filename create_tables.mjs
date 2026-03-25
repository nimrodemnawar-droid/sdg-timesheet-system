import mysql from 'mysql2/promise';

const sql = `
CREATE TABLE IF NOT EXISTS \`notificationHistory\` (
\`id\` int AUTO_INCREMENT NOT NULL,
\`userId\` int NOT NULL,
\`title\` varchar(255) NOT NULL,
\`content\` text NOT NULL,
\`eventType\` enum('CHECK_IN','CHECK_OUT','LEAVE_APPROVAL','OVERTIME_ALERT','SYSTEM') NOT NULL,
\`eventEntityId\` int,
\`deliveryStatus\` enum('PENDING','SENT','DELIVERED','FAILED') NOT NULL DEFAULT 'PENDING',
\`channels\` json NOT NULL,
\`deliveryDetails\` json NOT NULL DEFAULT ('{}'),
\`readAt\` timestamp,
\`archivedAt\` timestamp,
\`createdAt\` timestamp NOT NULL DEFAULT (now()),
\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
CONSTRAINT \`notificationHistory_id\` PRIMARY KEY(\`id\`),
CONSTRAINT \`notificationHistory_userId_users_id_fk\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS \`notificationPreferences\` (
\`id\` int AUTO_INCREMENT NOT NULL,
\`userId\` int NOT NULL,
\`enableCheckInNotifications\` boolean NOT NULL DEFAULT true,
\`enableCheckOutNotifications\` boolean NOT NULL DEFAULT true,
\`enableLeaveApprovalNotifications\` boolean NOT NULL DEFAULT true,
\`enableOvertimeAlerts\` boolean NOT NULL DEFAULT true,
\`quietHoursEnabled\` boolean NOT NULL DEFAULT false,
\`quietHoursStart\` varchar(5),
\`quietHoursEnd\` varchar(5),
\`quietHoursTimezone\` varchar(50) NOT NULL DEFAULT 'UTC',
\`notificationChannels\` json NOT NULL DEFAULT ('{"inApp":true,"email":false,"push":false}'),
\`createdAt\` timestamp NOT NULL DEFAULT (now()),
\`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
CONSTRAINT \`notificationPreferences_id\` PRIMARY KEY(\`id\`),
CONSTRAINT \`notificationPreferences_userId_users_id_fk\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade ON UPDATE no action
);
`;

try {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  console.log('✓ Database connected');
  
  const statements = sql.split(';').filter(s => s.trim());
  for (const statement of statements) {
    if (statement.trim()) {
      await connection.execute(statement);
      console.log('✓ Executed:', statement.substring(0, 50) + '...');
    }
  }
  
  const [tables] = await connection.execute("SHOW TABLES LIKE 'notification%'");
  console.log('✓ Notification tables created:', tables.map(t => Object.values(t)[0]));
  
  await connection.end();
  console.log('✓ Done');
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
