require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');

// Initialize database & tables
require('./src/config/db');

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const studentRoutes = require('./src/routes/student.routes');
const teacherRoutes = require('./src/routes/teacher.routes');
const courseRoutes = require('./src/routes/course.routes');
const attendanceRoutes = require('./src/routes/attendance.routes');
const gradeRoutes = require('./src/routes/grade.routes');
const feeRoutes = require('./src/routes/fee.routes');
const announcementRoutes = require('./src/routes/announcement.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'Student Management System API',
    timestamp: new Date().toISOString()
  });
});

// SPA fallback for direct navigation
app.use((req, res, next) => {
  // If it's an API route that wasn't found, return 404 JSON instead of HTML
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🎓 Student Management System is running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🔑 Credentials:`);
  console.log(`   - Admin:   admin@sms.edu   / Ocholla@`);
  console.log(`   - Teacher: teacher@sms.edu / teacher123`);
  console.log(`   - Student: student@sms.edu / student123`);
  console.log(`====================================================`);
});
