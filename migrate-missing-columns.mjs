import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;

async function migrate() {
  try {
    const conn = await mysql.createConnection(url);
    
    // Check if columns exist
    const [columns] = await conn.query('DESCRIBE notificationHistory');
    const columnNames = columns.map(c => c.Field);
    
    console.log('Current columns:', columnNames);
    
    // Add missing columns
    if (!columnNames.includes('eventEntityId')) {
      console.log('Adding eventEntityId column...');
      await conn.query('ALTER TABLE notificationHistory ADD COLUMN eventEntityId INT AFTER eventType');
      console.log('✓ eventEntityId added');
    }
    
    if (!columnNames.includes('deliveryDetails')) {
      console.log('Adding deliveryDetails column...');
      await conn.query('ALTER TABLE notificationHistory ADD COLUMN deliveryDetails JSON AFTER channels');
      console.log('✓ deliveryDetails added');
    }
    
    const [newColumns] = await conn.query('DESCRIBE notificationHistory');
    console.log('Updated columns:', newColumns.map(c => c.Field));
    
    await conn.end();
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

migrate();
