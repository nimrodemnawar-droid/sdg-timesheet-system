import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Parse MySQL URL
const urlObj = new URL(url);
const config = {
  host: urlObj.hostname,
  user: urlObj.username,
  password: urlObj.password,
  database: urlObj.pathname.slice(1),
  ssl: {}, // Enable SSL for TiDB with default settings
};

console.log('Connecting to database...');
const connection = await mysql.createConnection(config);

try {
  console.log('Creating reportSchedules table...');
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS \`reportSchedules\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`reportType\` enum('attendance','overtime','leave','gps_activity','all') NOT NULL,
      \`frequency\` enum('daily','weekly') NOT NULL,
      \`dayOfWeek\` varchar(20),
      \`timeOfDay\` varchar(5) NOT NULL,
      \`timezone\` varchar(50) NOT NULL DEFAULT 'UTC',
      \`emailRecipients\` json NOT NULL,
      \`isActive\` boolean NOT NULL DEFAULT true,
      \`lastSentAt\` timestamp,
      \`nextScheduledAt\` timestamp,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`reportSchedules_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`reportSchedules_userId_users_id_fk\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE cascade ON UPDATE no action
    )
  `);
  console.log('✓ reportSchedules table created');

  console.log('Creating reportDeliveryHistory table...');
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS \`reportDeliveryHistory\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`scheduleId\` int NOT NULL,
      \`reportType\` enum('attendance','overtime','leave','gps_activity','all') NOT NULL,
      \`generatedAt\` timestamp NOT NULL DEFAULT (now()),
      \`sentAt\` timestamp,
      \`recipientEmails\` json NOT NULL,
      \`deliveryStatus\` enum('PENDING','SENT','FAILED') NOT NULL DEFAULT 'PENDING',
      \`errorMessage\` text,
      \`fileUrl\` text,
      \`fileSize\` int,
      \`recordCount\` int,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`reportDeliveryHistory_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`reportDeliveryHistory_scheduleId_reportSchedules_id_fk\` FOREIGN KEY (\`scheduleId\`) REFERENCES \`reportSchedules\`(\`id\`) ON DELETE cascade ON UPDATE no action
    )
  `);
  console.log('✓ reportDeliveryHistory table created');

  console.log('\n✓ Migration completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
} finally {
  await connection.end();
}
