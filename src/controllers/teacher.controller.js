const db = require('../config/db');

exports.getAllTeachers = (req, res) => {
  try {
    const { department = '', search = '' } = req.query;
    let query = `
      SELECT t.*, u.username,
        (SELECT COUNT(*) FROM courses c WHERE c.teacher_id = t.id) as course_count
      FROM teachers t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search.trim()) {
      query += ` AND (t.first_name LIKE ? OR t.last_name LIKE ? OR t.teacher_id_code LIKE ? OR t.email LIKE ?)`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    if (department.trim()) {
      query += ` AND t.department = ?`;
      params.push(department.trim());
    }

    query += ` ORDER BY t.id DESC`;

    const teachers = db.prepare(query).all(...params);
    res.json({ success: true, data: teachers });
  } catch (error) {
    console.error('getAllTeachers error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve teachers.' });
  }
};

exports.getTeacherById = (req, res) => {
  try {
    const { id } = req.params;
    const teacher = db.prepare(`
      SELECT t.*, u.username 
      FROM teachers t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `).get(id);

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found.' });
    }

    const courses = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as enrolled_students
      FROM courses c
      WHERE c.teacher_id = ?
    `).all(id);

    res.json({ success: true, teacher, courses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve teacher details.' });
  }
};

exports.createTeacher = (req, res) => {
  try {
    const {
      teacher_id_code,
      first_name,
      last_name,
      email,
      phone,
      department,
      designation,
      qualification,
      joining_date = new Date().toISOString().split('T')[0],
      status = 'Active'
    } = req.body;

    if (!first_name || !last_name || !email || !department) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, and department are required.'
      });
    }

    let finalCode = teacher_id_code;
    if (!finalCode) {
      const last = db.prepare('SELECT id FROM teachers ORDER BY id DESC LIMIT 1').get();
      const nextId = last ? last.id + 1 : 1;
      finalCode = `TCH-${new Date().getFullYear()}-${String(nextId).padStart(2, '0')}`;
    }

    const insert = db.prepare(`
      INSERT INTO teachers (
        teacher_id_code, first_name, last_name, email, phone,
        department, designation, qualification, joining_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      finalCode,
      first_name.trim(),
      last_name.trim(),
      email.trim().toLowerCase(),
      phone || null,
      department.trim(),
      designation || 'Lecturer',
      qualification || 'Master of Science',
      joining_date,
      status
    );

    res.status(201).json({
      success: true,
      message: 'Teacher added successfully.',
      teacherId: insert.lastInsertRowid
    });
  } catch (error) {
    console.error('createTeacher error:', error);
    res.status(500).json({ success: false, message: 'Failed to create teacher.' });
  }
};

exports.updateTeacher = (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      phone,
      department,
      designation,
      qualification,
      joining_date,
      status
    } = req.body;

    db.prepare(`
      UPDATE teachers SET
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        department = COALESCE(?, department),
        designation = COALESCE(?, designation),
        qualification = COALESCE(?, qualification),
        joining_date = COALESCE(?, joining_date),
        status = COALESCE(?, status)
      WHERE id = ?
    `).run(
      first_name ? first_name.trim() : null,
      last_name ? last_name.trim() : null,
      email ? email.trim().toLowerCase() : null,
      phone || null,
      department ? department.trim() : null,
      designation || null,
      qualification || null,
      joining_date || null,
      status || null,
      id
    );

    res.json({ success: true, message: 'Teacher details updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update teacher.' });
  }
};

exports.deleteTeacher = (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM teachers WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Teacher not found.' });
    }
    res.json({ success: true, message: 'Teacher removed successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete teacher.' });
  }
};
