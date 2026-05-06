import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sdg_timesheet',
});

try {
  const [rows] = await connection.execute('SELECT COUNT(*) as count FROM attendance');
  console.log('Total attendance records:', rows[0].count);
  
  const [records] = await connection.execute('SELECT id, userId, checkInTime, checkOutTime, isSubmitted, amStartTime, amEndTime, taskDescription FROM attendance ORDER BY checkInTime DESC LIMIT 5');
  console.log('Last 5 records:');
  console.log(JSON.stringify(records, null, 2));
} catch (error) {
  console.error('Database error:', error.message);
} finally {
  await connection.end();
}
