import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
console.log('Testing timesheet data persistence...\n');

try {
  const connection = await mysql.createConnection(dbUrl);
  
  // Get the first attendance record
  const [records] = await connection.execute(`
    SELECT id, userId, isSubmitted, amStartTime FROM attendance LIMIT 1
  `);
  
  if (records.length === 0) {
    console.log('No attendance records found');
    await connection.end();
    process.exit(0);
  }
  
  const recordId = records[0].id;
  console.log(`Testing with attendance record ID: ${recordId}`);
  console.log(`Current isSubmitted: ${records[0].isSubmitted}`);
  console.log(`Current amStartTime: ${records[0].amStartTime}\n`);
  
  // Try to update with timesheet data
  const testTime = new Date();
  testTime.setHours(9, 0, 0, 0);
  
  console.log('Attempting to update with:');
  console.log(`  - amStartTime: ${testTime.toISOString()}`);
  console.log(`  - taskDescription: "Test task description"`);
  console.log(`  - isSubmitted: true\n`);
  
  const updateResult = await connection.execute(`
    UPDATE attendance 
    SET 
      amStartTime = ?,
      taskDescription = ?,
      isSubmitted = true,
      submittedAt = NOW()
    WHERE id = ?
  `, [testTime, 'Test task description', recordId]);
  
  console.log(`Update result: ${updateResult[0].affectedRows} rows affected\n`);
  
  // Verify the update
  const [updatedRecords] = await connection.execute(`
    SELECT id, isSubmitted, amStartTime, taskDescription FROM attendance WHERE id = ?
  `, [recordId]);
  
  console.log('After update:');
  console.log(`  - isSubmitted: ${updatedRecords[0].isSubmitted}`);
  console.log(`  - amStartTime: ${updatedRecords[0].amStartTime}`);
  console.log(`  - taskDescription: ${updatedRecords[0].taskDescription}`);
  
  if (updatedRecords[0].amStartTime && updatedRecords[0].taskDescription === 'Test task description') {
    console.log('\n✓ SUCCESS: Data was saved to database');
  } else {
    console.log('\n✗ FAILURE: Data was NOT saved to database');
  }
  
  await connection.end();
} catch (error) {
  console.error('✗ Error:', error.message);
  process.exit(1);
}
