import mysql from 'mysql2/promise';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2/promise';
import * as schema from './drizzle/schema.ts';

const dbUrl = process.env.DATABASE_URL;
console.log('Testing updateAttendanceWithTimesheetData function...\n');

try {
  // Create Drizzle connection
  const connection = await mysql.createConnection(dbUrl);
  const db = drizzle(connection, { schema });
  
  // Get first attendance record
  const records = await db.select().from(schema.attendance).limit(1);
  
  if (records.length === 0) {
    console.log('No attendance records found');
    await connection.end();
    process.exit(0);
  }
  
  const recordId = records[0].id;
  console.log(`Testing with attendance record ID: ${recordId}`);
  console.log(`Current amStartTime: ${records[0].amStartTime}`);
  console.log(`Current taskDescription: ${records[0].taskDescription}\n`);
  
  // Simulate the update
  const today = new Date();
  const amStart = new Date(today);
  amStart.setHours(9, 30, 0, 0);
  
  const updateData = {
    amStartTime: amStart,
    taskDescription: 'Test from direct update',
    isSubmitted: true,
    submittedAt: new Date(),
    updatedAt: new Date(),
  };
  
  console.log('Attempting update with Drizzle ORM:');
  console.log(`  - amStartTime: ${amStart}`);
  console.log(`  - taskDescription: Test from direct update`);
  console.log(`  - isSubmitted: true\n`);
  
  const result = await db
    .update(schema.attendance)
    .set(updateData)
    .where(eq(schema.attendance.id, recordId));
  
  console.log(`Update completed\n`);
  
  // Verify
  const updated = await db
    .select()
    .from(schema.attendance)
    .where(eq(schema.attendance.id, recordId));
  
  console.log('After update:');
  console.log(`  - amStartTime: ${updated[0].amStartTime}`);
  console.log(`  - taskDescription: ${updated[0].taskDescription}`);
  console.log(`  - isSubmitted: ${updated[0].isSubmitted}`);
  
  if (updated[0].amStartTime && updated[0].taskDescription === 'Test from direct update') {
    console.log('\n✓ SUCCESS: Drizzle ORM update worked');
  } else {
    console.log('\n✗ FAILURE: Drizzle ORM update did not work');
  }
  
  await connection.end();
} catch (error) {
  console.error('✗ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
