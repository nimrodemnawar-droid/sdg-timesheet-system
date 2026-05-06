-- Create activity_categories table
CREATE TABLE IF NOT EXISTS `activityCategories` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(255) NOT NULL UNIQUE,
  `description` text,
  `icon` text,
  `isActive` boolean DEFAULT true NOT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

-- Create kpis table
CREATE TABLE IF NOT EXISTS `kpis` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(255) NOT NULL UNIQUE,
  `description` text,
  `sdgGoalId` int,
  `targetValue` decimal(10, 2),
  `isActive` boolean DEFAULT true NOT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

-- Insert activity categories
INSERT IGNORE INTO `activityCategories` (`name`, `description`, `createdAt`, `updatedAt`) VALUES
('Program Implementation', 'Implementation of SDG programs and initiatives', NOW(), NOW()),
('Community Outreach', 'Community engagement and outreach activities', NOW(), NOW()),
('Training & Workshop Facilitation', 'Conducting training sessions and workshops', NOW(), NOW()),
('Monitoring & Evaluation', 'M&E activities and assessments', NOW(), NOW()),
('Data Collection', 'Collecting data for programs and reports', NOW(), NOW()),
('Reporting & Documentation', 'Creating reports and documentation', NOW(), NOW()),
('ICT Development', 'Information and Communication Technology development', NOW(), NOW()),
('System Maintenance', 'Maintaining systems and infrastructure', NOW(), NOW()),
('Stakeholder Engagement', 'Engaging with stakeholders and partners', NOW(), NOW()),
('Environmental Activity', 'Environmental conservation and sustainability work', NOW(), NOW()),
('Education Support', 'Supporting education initiatives', NOW(), NOW()),
('Health Outreach', 'Health promotion and outreach activities', NOW(), NOW()),
('Research & Proposal Writing', 'Conducting research and writing proposals', NOW(), NOW()),
('Administrative Work', 'Administrative and office tasks', NOW(), NOW()),
('Field Visit', 'Field visits and site inspections', NOW(), NOW()),
('Partnership Development', 'Developing partnerships and collaborations', NOW(), NOW()),
('Youth Empowerment', 'Youth empowerment and development activities', NOW(), NOW()),
('Women Empowerment', 'Women empowerment and gender programs', NOW(), NOW()),
('Digital Transformation', 'Digital transformation initiatives', NOW(), NOW());
