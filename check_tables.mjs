import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await connection.execute("SHOW TABLES LIKE 'notification%'");
console.log('Notification tables:', rows);
await connection.end();
