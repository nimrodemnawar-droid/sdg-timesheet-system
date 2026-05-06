import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;

try {
  const connection = await mysql.createConnection(dbUrl);
  
  // Test the update query with the exact parameters from the error
  const query = `update \`attendance\` set \`amStartTime\` = ?, \`amEndTime\` = ?, \`pmStartTime\` = ?, \`pmEndTime\` = ?, \`workModality\` = ?, \`activityCategoryId\` = ?, \`sdgGoalId\` = ?, \`program\` = ?, \`taskDescription\` = ?, \`staffRemarks\` = ?, \`isSubmitted\` = ?, \`submittedAt\` = ?, \`updatedAt\` = ? where \`attendance\`.\`id\` = ?`;
  
  const params = [
    '2026-05-06 13:56:00.000',
    '2026-05-06 16:59:00.000',
    '2026-05-06 17:56:00.000',
    '2026-05-06 21:58:00.000',
    'Remote',
    7,
    1,
    '',
    'checking if the sytem works',
    'interestin experience',
    true,
    '2026-05-06 06:57:56.392',
    '2026-05-06 06:57:56.392',
    630001
  ];
  
  console.log('Executing query with params:');
  console.log('Query:', query);
  console.log('Params:', params);
  console.log('');
  
  try {
    const [result] = await connection.execute(query, params);
    console.log('✓ Query successful');
    console.log('Result:', result);
  } catch (error) {
    console.error('✗ Query failed');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('SQL:', error.sql);
  }
  
  await connection.end();
} catch (error) {
  console.error('Connection error:', error.message);
  process.exit(1);
}
