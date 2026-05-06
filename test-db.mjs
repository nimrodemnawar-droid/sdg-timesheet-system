import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
console.log('Connecting to database...');

try {
  const connection = await mysql.createConnection(dbUrl);
  
  const [rows] = await connection.execute('SELECT COUNT(*) as count FROM attendance');
  console.log('✓ Total attendance records:', rows[0].count);
  
  const [records] = await connection.execute(`
    SELECT 
      id, userId, checkInTime, isSubmitted, 
      amStartTime, amEndTime, pmStartTime, pmEndTime,
      taskDescription, staffRemarks, activityCategoryId, sdgGoalId
    FROM attendance 
    ORDER BY checkInTime DESC 
    LIMIT 3
  `);
  
  console.log('\n✓ Last 3 records:');
  records.forEach((r, i) => {
    console.log(`\nRecord ${i+1}:`);
    console.log(`  ID: ${r.id}, User: ${r.userId}, Submitted: ${r.isSubmitted}`);
    console.log(`  Check-in: ${r.checkInTime}`);
    console.log(`  AM: ${r.amStartTime} - ${r.amEndTime}`);
    console.log(`  PM: ${r.pmStartTime} - ${r.pmEndTime}`);
    console.log(`  Task: ${r.taskDescription}`);
    console.log(`  Remarks: ${r.staffRemarks}`);
  });
  
  await connection.end();
} catch (error) {
  console.error('✗ Error:', error.message);
  process.exit(1);
}
