const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Ensure database directory exists
const dbDir = path.join(__dirname, '../../database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'sms.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better concurrency
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'student')),
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      teacher_id_code TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      department TEXT NOT NULL,
      designation TEXT,
      qualification TEXT,
      joining_date DATE,
      status TEXT DEFAULT 'Active' CHECK(status IN ('Active', 'On Leave', 'Inactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      student_id_code TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      gender TEXT CHECK(gender IN ('Male', 'Female', 'Other')),
      dob DATE,
      address TEXT,
      guardian_name TEXT,
      guardian_phone TEXT,
      department TEXT NOT NULL,
      enrollment_date DATE NOT NULL,
      status TEXT DEFAULT 'Active' CHECK(status IN ('Active', 'Graduated', 'Suspended', 'Inactive')),
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      department TEXT NOT NULL,
      credits INTEGER DEFAULT 3,
      teacher_id INTEGER,
      semester TEXT DEFAULT 'Spring 2026',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      enrollment_date DATE DEFAULT CURRENT_DATE,
      status TEXT DEFAULT 'Enrolled' CHECK(status IN ('Enrolled', 'Completed', 'Dropped')),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      UNIQUE(student_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      date DATE NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Present', 'Absent', 'Late', 'Excused')),
      remarks TEXT,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      UNIQUE(student_id, course_id, date)
    );

    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      assignment_score REAL DEFAULT 0,
      midterm_score REAL DEFAULT 0,
      final_score REAL DEFAULT 0,
      total_score REAL DEFAULT 0,
      grade_letter TEXT,
      remarks TEXT,
      term TEXT DEFAULT 'Spring 2026',
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      UNIQUE(student_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      fee_type TEXT NOT NULL,
      amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      due_date DATE NOT NULL,
      status TEXT DEFAULT 'Unpaid' CHECK(status IN ('Paid', 'Partial', 'Unpaid')),
      payment_method TEXT,
      transaction_id TEXT,
      payment_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'General' CHECK(category IN ('General', 'Academic', 'Exam', 'Holiday', 'Event')),
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedData();
}

function calculateGrade(total) {
  if (total >= 90) return 'A';
  if (total >= 80) return 'B';
  if (total >= 70) return 'C';
  if (total >= 60) return 'D';
  return 'F';
}

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    return; // Already seeded
  }

  console.log('Seeding initial student management database...');

  const salt = bcrypt.genSaltSync(10);
  const adminPass = bcrypt.hashSync('Ocholla@', salt);
  const teacherPass = bcrypt.hashSync('teacher123', salt);
  const studentPass = bcrypt.hashSync('student123', salt);

  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password, full_name, role)
    VALUES (?, ?, ?, ?, ?)
  `);

  // 1. Insert Users
  const adminUser = insertUser.run('admin', 'admin@sms.edu', adminPass, 'System Administrator', 'admin');
  const teacher1User = insertUser.run('dr_smith', 'teacher@sms.edu', teacherPass, 'Dr. Alan Smith', 'teacher');
  const teacher2User = insertUser.run('prof_sarah', 'sarah@sms.edu', teacherPass, 'Prof. Sarah Johnson', 'teacher');
  const teacher3User = insertUser.run('dr_david', 'david@sms.edu', teacherPass, 'Dr. David Kim', 'teacher');
  
  const student1User = insertUser.run('james_o', 'student@sms.edu', studentPass, 'James Ocholla', 'student');
  const student2User = insertUser.run('emily_w', 'emily@sms.edu', studentPass, 'Emily Watson', 'student');
  const student3User = insertUser.run('michael_b', 'michael@sms.edu', studentPass, 'Michael Brown', 'student');

  // 2. Insert Teachers
  const insertTeacher = db.prepare(`
    INSERT INTO teachers (user_id, teacher_id_code, first_name, last_name, email, phone, department, designation, qualification, joining_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const t1 = insertTeacher.run(teacher1User.lastInsertRowid, 'TCH-2023-01', 'Alan', 'Smith', 'teacher@sms.edu', '+1-555-0101', 'Computer Science', 'Head of Department', 'Ph.D. in Computer Science', '2023-01-15', 'Active');
  const t2 = insertTeacher.run(teacher2User.lastInsertRowid, 'TCH-2023-02', 'Sarah', 'Johnson', 'sarah@sms.edu', '+1-555-0102', 'Mathematics', 'Associate Professor', 'Ph.D. in Applied Mathematics', '2023-08-20', 'Active');
  const t3 = insertTeacher.run(teacher3User.lastInsertRowid, 'TCH-2024-03', 'David', 'Kim', 'david@sms.edu', '+1-555-0103', 'Business Administration', 'Senior Lecturer', 'MBA, CPA', '2024-02-01', 'Active');

  // 3. Insert Students
  const insertStudent = db.prepare(`
    INSERT INTO students (user_id, student_id_code, first_name, last_name, email, phone, gender, dob, address, guardian_name, guardian_phone, department, enrollment_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const s1 = insertStudent.run(student1User.lastInsertRowid, 'STU-2024-001', 'James', 'Ocholla', 'student@sms.edu', '+1-555-0201', 'Male', '2003-05-14', '742 Evergreen Terrace, Springfield', 'Peter Ocholla', '+1-555-0901', 'Computer Science', '2024-09-01', 'Active');
  const s2 = insertStudent.run(student2User.lastInsertRowid, 'STU-2024-002', 'Emily', 'Watson', 'emily@sms.edu', '+1-555-0202', 'Female', '2004-02-18', '124 Conch Street, Bikini', 'Grace Watson', '+1-555-0902', 'Computer Science', '2024-09-01', 'Active');
  const s3 = insertStudent.run(student3User.lastInsertRowid, 'STU-2024-003', 'Michael', 'Brown', 'michael@sms.edu', '+1-555-0203', 'Male', '2003-11-22', '31 Spooner Street, Quahog', 'Robert Brown', '+1-555-0903', 'Business Administration', '2024-09-01', 'Active');
  
  // Extra students without direct user accounts yet (can be registered or linked)
  const s4 = insertStudent.run(null, 'STU-2024-004', 'Sophia', 'Martinez', 'sophia.m@sms.edu', '+1-555-0204', 'Female', '2004-07-30', '42 Wallaby Way, Sydney', 'Elena Martinez', '+1-555-0904', 'Mathematics', '2024-09-01', 'Active');
  const s5 = insertStudent.run(null, 'STU-2024-005', 'Daniel', 'Lee', 'daniel.l@sms.edu', '+1-555-0205', 'Male', '2003-09-10', '10 Downing St, London', 'Hana Lee', '+1-555-0905', 'Computer Science', '2024-09-01', 'Active');
  const s6 = insertStudent.run(null, 'STU-2024-006', 'Olivia', 'Taylor', 'olivia.t@sms.edu', '+1-555-0206', 'Female', '2002-12-05', '840 Baker Street, London', 'William Taylor', '+1-555-0906', 'Business Administration', '2023-09-01', 'Active');

  // 4. Insert Courses
  const insertCourse = db.prepare(`
    INSERT INTO courses (code, title, description, department, credits, teacher_id, semester)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const c1 = insertCourse.run('CS101', 'Introduction to Computer Science', 'Foundations of algorithms, data structures, and programming in Python/JavaScript.', 'Computer Science', 4, t1.lastInsertRowid, 'Spring 2026');
  const c2 = insertCourse.run('CS204', 'Database Management Systems', 'Relational design, SQL, normalization, indexes, and ACID transactions.', 'Computer Science', 3, t1.lastInsertRowid, 'Spring 2026');
  const c3 = insertCourse.run('MATH201', 'Calculus & Linear Algebra', 'Differential equations, matrix theory, and vector calculus.', 'Mathematics', 4, t2.lastInsertRowid, 'Spring 2026');
  const c4 = insertCourse.run('BUS110', 'Principles of Modern Management', 'Organizational behavior, leadership ethics, and strategic planning.', 'Business Administration', 3, t3.lastInsertRowid, 'Spring 2026');
  const c5 = insertCourse.run('BUS220', 'Financial Accounting & Reporting', 'Financial statements, ledger management, balance sheets, and budgeting.', 'Business Administration', 3, t3.lastInsertRowid, 'Spring 2026');

  // 5. Enrollments
  const insertEnrollment = db.prepare(`
    INSERT INTO enrollments (student_id, course_id, enrollment_date, status)
    VALUES (?, ?, ?, ?)
  `);

  insertEnrollment.run(s1.lastInsertRowid, c1.lastInsertRowid, '2026-01-10', 'Enrolled');
  insertEnrollment.run(s1.lastInsertRowid, c2.lastInsertRowid, '2026-01-10', 'Enrolled');
  insertEnrollment.run(s1.lastInsertRowid, c3.lastInsertRowid, '2026-01-10', 'Enrolled');

  insertEnrollment.run(s2.lastInsertRowid, c1.lastInsertRowid, '2026-01-10', 'Enrolled');
  insertEnrollment.run(s2.lastInsertRowid, c2.lastInsertRowid, '2026-01-10', 'Enrolled');

  insertEnrollment.run(s3.lastInsertRowid, c4.lastInsertRowid, '2026-01-10', 'Enrolled');
  insertEnrollment.run(s3.lastInsertRowid, c5.lastInsertRowid, '2026-01-10', 'Enrolled');

  insertEnrollment.run(s4.lastInsertRowid, c3.lastInsertRowid, '2026-01-10', 'Enrolled');
  insertEnrollment.run(s5.lastInsertRowid, c1.lastInsertRowid, '2026-01-10', 'Enrolled');
  insertEnrollment.run(s5.lastInsertRowid, c2.lastInsertRowid, '2026-01-10', 'Enrolled');
  insertEnrollment.run(s6.lastInsertRowid, c4.lastInsertRowid, '2026-01-10', 'Enrolled');

  // 6. Grades
  const insertGrade = db.prepare(`
    INSERT INTO grades (student_id, course_id, assignment_score, midterm_score, final_score, total_score, grade_letter, remarks, term)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  function addGradeRecord(studentId, courseId, assign, mid, fin, remarks) {
    const total = Math.round((assign * 0.2 + mid * 0.3 + fin * 0.5) * 10) / 10;
    const letter = calculateGrade(total);
    insertGrade.run(studentId, courseId, assign, mid, fin, total, letter, remarks, 'Spring 2026');
  }

  addGradeRecord(s1.lastInsertRowid, c1.lastInsertRowid, 94, 90, 96, 'Outstanding analytical ability.');
  addGradeRecord(s1.lastInsertRowid, c2.lastInsertRowid, 88, 85, 91, 'Great mastery of SQL queries.');
  addGradeRecord(s1.lastInsertRowid, c3.lastInsertRowid, 82, 78, 84, 'Consistent effort and good problem solving.');

  addGradeRecord(s2.lastInsertRowid, c1.lastInsertRowid, 96, 92, 95, 'Top of the class programming lab submissions.');
  addGradeRecord(s2.lastInsertRowid, c2.lastInsertRowid, 90, 89, 93, 'Excellent database schema design.');

  addGradeRecord(s3.lastInsertRowid, c4.lastInsertRowid, 85, 80, 86, 'Strong group project leadership.');
  addGradeRecord(s3.lastInsertRowid, c5.lastInsertRowid, 75, 70, 78, 'Satisfactory financial ratio analysis.');

  addGradeRecord(s5.lastInsertRowid, c1.lastInsertRowid, 80, 75, 82, 'Good progress throughout the semester.');

  // 7. Attendance
  const insertAttendance = db.prepare(`
    INSERT INTO attendance (student_id, course_id, date, status, remarks)
    VALUES (?, ?, ?, ?, ?)
  `);

  const sampleDates = ['2026-02-02', '2026-02-04', '2026-02-09', '2026-02-11', '2026-02-16'];
  sampleDates.forEach((date, idx) => {
    insertAttendance.run(s1.lastInsertRowid, c1.lastInsertRowid, date, idx === 3 ? 'Late' : 'Present', idx === 3 ? 'Bus delay' : 'On time');
    insertAttendance.run(s2.lastInsertRowid, c1.lastInsertRowid, date, 'Present', 'On time');
    insertAttendance.run(s5.lastInsertRowid, c1.lastInsertRowid, date, idx === 1 ? 'Absent' : 'Present', idx === 1 ? 'Medical notice' : 'On time');
    
    insertAttendance.run(s1.lastInsertRowid, c2.lastInsertRowid, date, 'Present', 'Attended lab session');
    insertAttendance.run(s2.lastInsertRowid, c2.lastInsertRowid, date, 'Present', 'Active participant');
    
    insertAttendance.run(s3.lastInsertRowid, c4.lastInsertRowid, date, idx === 4 ? 'Excused' : 'Present', idx === 4 ? 'Sports meet' : 'Present');
  });

  // 8. Fees
  const insertFee = db.prepare(`
    INSERT INTO fees (student_id, fee_type, amount, paid_amount, due_date, status, payment_method, transaction_id, payment_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertFee.run(s1.lastInsertRowid, 'Spring Semester Tuition', 2500, 1200, '2026-02-15', 'Partial', 'Bank Transfer', 'TXN-9021-8841', '2026-01-20');
  insertFee.run(s1.lastInsertRowid, 'Computer Lab Fee', 350, 350, '2026-02-15', 'Paid', 'Bank Transfer', 'TXN-9021-8842', '2026-01-20');
  insertFee.run(s1.lastInsertRowid, 'Campus Library & Tech Fee', 150, 0, '2026-03-30', 'Unpaid', null, null, null);

  insertFee.run(s2.lastInsertRowid, 'Spring Semester Tuition', 2500, 2500, '2026-02-15', 'Paid', 'Online Banking', 'TXN-7734-1109', '2026-01-22');
  insertFee.run(s2.lastInsertRowid, 'Computer Lab Fee', 350, 200, '2026-03-01', 'Partial', 'Cash', 'TXN-7734-1110', '2026-02-05');

  insertFee.run(s3.lastInsertRowid, 'Spring Semester Tuition', 2200, 1000, '2026-03-15', 'Partial', 'Bank Transfer', 'TXN-5541-0021', '2026-02-10');
  insertFee.run(s4.lastInsertRowid, 'Spring Semester Tuition', 2400, 0, '2026-03-15', 'Unpaid', null, null, null);

  // 9. Announcements
  const insertAnnouncement = db.prepare(`
    INSERT INTO announcements (title, content, category, author_name, author_role)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertAnnouncement.run(
    'Spring 2026 Midterm Examination Schedule Published',
    'The timetable for all midterm examinations is now officially uploaded. Please check your course portals for venue allocation and timings.',
    'Exam',
    'System Administrator',
    'admin'
  );

  insertAnnouncement.run(
    'Annual Tech Symposium & Hackathon Registration',
    'Registrations are open for the 2026 Inter-College Hackathon. Teams of up to 4 members can register under the Computer Science department before March 10.',
    'Event',
    'Dr. Alan Smith',
    'teacher'
  );

  insertAnnouncement.run(
    'Library Extended Hours During Finals Week',
    'The campus central library will operate 24/7 starting next Monday to assist all students with exam preparations and study groups.',
    'Academic',
    'System Administrator',
    'admin'
  );

  console.log('Database seeded successfully with users, teachers, students, courses, grades, attendance, and fees.');
}

// Initialize on require
initDatabase();

module.exports = db;
