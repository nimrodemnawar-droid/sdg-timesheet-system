import mysql from 'mysql2/promise';

try {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  console.log('✓ Database connected');
  
  const [tables] = await connection.execute("SHOW TABLES");
  console.log('Tables in database:', tables.map(t => Object.values(t)[0]));
  
  const [notifTables] = await connection.execute("SHOW TABLES LIKE 'notification%'");
  console.log('Notification tables:', notifTables);
  
  await connection.end();
} catch (error) {
  console.error('Error:', error.message);
}
