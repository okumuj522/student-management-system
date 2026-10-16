const db = require('../config/db');

exports.getAllStudents = (req, res) => {
  try {
    const { search = '', department = '', status = '', page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT s.*, u.username 
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search.trim()) {
      query += ` AND (
        s.first_name LIKE ? OR 
        s.last_name LIKE ? OR 
        s.student_id_code LIKE ? OR 
        s.email LIKE ?
      )`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    if (department.trim()) {
      query += ` AND s.department = ?`;
      params.push(department.trim());
    }

    if (status.trim()) {
      query += ` AND s.status = ?`;
      params.push(status.trim());
    }

    // Get total count
    const countQuery = query.replace('SELECT s.*, u.username', 'SELECT COUNT(*) as total');
    const total = db.prepare(countQuery).get(...params).total;

    query += ` ORDER BY s.id DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const students = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: students,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('getAllStudents error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve students.' });
  }
};

exports.getStudentById = (req, res) => {
  try {
    const { id } = req.params;

    const student = db.prepare(`
      SELECT s.*, u.username 
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `).get(id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    // Enrolled courses
    const courses = db.prepare(`
      SELECT c.*, e.enrollment_date, e.status as enrollment_status,
             t.first_name as teacher_first_name, t.last_name as teacher_last_name
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN teachers t ON c.teacher_id = t.id
      WHERE e.student_id = ?
    `).all(id);

    // Grades
    const grades = db.prepare(`
      SELECT g.*, c.code as course_code, c.title as course_title, c.credits
      FROM grades g
      JOIN courses c ON g.course_id = c.id
      WHERE g.student_id = ?
    `).all(id);

    // Attendance summary
    const attendanceStats = db.prepare(`
      SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late_days,
        SUM(CASE WHEN status = 'Excused' THEN 1 ELSE 0 END) as excused_days
      FROM attendance
      WHERE student_id = ?
    `).get(id);

    // Recent attendance records
    const attendanceHistory = db.prepare(`
      SELECT a.*, c.code as course_code, c.title as course_title
      FROM attendance a
      JOIN courses c ON a.course_id = c.id
      WHERE a.student_id = ?
      ORDER BY a.date DESC
      LIMIT 20
    `).all(id);

    // Fees
    const fees = db.prepare(`
      SELECT * FROM fees WHERE student_id = ? ORDER BY due_date ASC
    `).all(id);

    res.json({
      success: true,
      student,
      courses,
      grades,
      attendanceStats,
      attendanceHistory,
      fees
    });
  } catch (error) {
    console.error('getStudentById error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve student details.' });
  }
};

exports.createStudent = (req, res) => {
  try {
    const {
      student_id_code,
      first_name,
      last_name,
      email,
      phone,
      gender,
      dob,
      address,
      guardian_name,
      guardian_phone,
      department,
      enrollment_date = new Date().toISOString().split('T')[0],
      status = 'Active'
    } = req.body;

    if (!first_name || !last_name || !email || !department) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, and department are required.'
      });
    }

    // Auto-generate student ID code if not provided
    let finalCode = student_id_code;
    if (!finalCode) {
      const last = db.prepare('SELECT id FROM students ORDER BY id DESC LIMIT 1').get();
      const nextId = last ? last.id + 1 : 1;
      finalCode = `STU-${new Date().getFullYear()}-${String(nextId).padStart(3, '0')}`;
    }

    const insert = db.prepare(`
      INSERT INTO students (
        student_id_code, first_name, last_name, email, phone, gender,
        dob, address, guardian_name, guardian_phone, department,
        enrollment_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      finalCode,
      first_name.trim(),
      last_name.trim(),
      email.trim().toLowerCase(),
      phone || null,
      gender || 'Male',
      dob || null,
      address || null,
      guardian_name || null,
      guardian_phone || null,
      department.trim(),
      enrollment_date,
      status
    );

    res.status(201).json({
      success: true,
      message: 'Student record created successfully.',
      studentId: insert.lastInsertRowid,
      studentCode: finalCode
    });
  } catch (error) {
    console.error('createStudent error:', error);
    if (error.message.includes('UNIQUE constraint failed: students.student_id_code')) {
      return res.status(400).json({ success: false, message: 'Student ID code already exists.' });
    }
    res.status(500).json({ success: false, message: 'Failed to create student.' });
  }
};

exports.updateStudent = (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      phone,
      gender,
      dob,
      address,
      guardian_name,
      guardian_phone,
      department,
      enrollment_date,
      status
    } = req.body;

    const current = db.prepare('SELECT id FROM students WHERE id = ?').get(id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    db.prepare(`
      UPDATE students SET
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        gender = COALESCE(?, gender),
        dob = COALESCE(?, dob),
        address = COALESCE(?, address),
        guardian_name = COALESCE(?, guardian_name),
        guardian_phone = COALESCE(?, guardian_phone),
        department = COALESCE(?, department),
        enrollment_date = COALESCE(?, enrollment_date),
        status = COALESCE(?, status)
      WHERE id = ?
    `).run(
      first_name ? first_name.trim() : null,
      last_name ? last_name.trim() : null,
      email ? email.trim().toLowerCase() : null,
      phone || null,
      gender || null,
      dob || null,
      address || null,
      guardian_name || null,
      guardian_phone || null,
      department ? department.trim() : null,
      enrollment_date || null,
      status || null,
      id
    );

    res.json({ success: true, message: 'Student updated successfully.' });
  } catch (error) {
    console.error('updateStudent error:', error);
    res.status(500).json({ success: false, message: 'Failed to update student.' });
  }
};

exports.deleteStudent = (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM students WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    res.json({ success: true, message: 'Student deleted successfully.' });
  } catch (error) {
    console.error('deleteStudent error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete student.' });
  }
};

// Returns student profile for currently logged-in student user
exports.getMyStudentProfile = (req, res) => {
  try {
    const student = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'No student record linked to your user account.' });
    }
    req.params.id = student.id;
    return exports.getStudentById(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch personal student profile.' });
  }
};
