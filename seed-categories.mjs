import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;

const categories = [
  'Program Implementation',
  'Community Outreach',
  'Training & Workshop Facilitation',
  'Monitoring & Evaluation',
  'Data Collection',
  'Reporting & Documentation',
  'ICT Development',
  'System Maintenance',
  'Stakeholder Engagement',
  'Environmental Activity',
  'Education Support',
  'Health Outreach',
  'Research & Proposal Writing',
  'Administrative Work',
  'Field Visit',
  'Partnership Development',
  'Youth Empowerment',
  'Women Empowerment',
  'Digital Transformation',
];

try {
  const connection = await mysql.createConnection(dbUrl);
  
  console.log('Seeding activity categories...\n');
  
  for (const category of categories) {
    const [result] = await connection.execute(
      'INSERT INTO activity_categories (name, createdAt, updatedAt) VALUES (?, NOW(), NOW())',
      [category]
    );
    console.log(`✓ Added: ${category}`);
  }
  
  console.log(`\n✓ Successfully seeded ${categories.length} activity categories`);
  
  await connection.end();
} catch (error) {
  if (error.code === 'ER_DUP_ENTRY') {
    console.log('Categories already exist in database');
  } else {
    console.error('Error:', error.message);
  }
  process.exit(1);
}
