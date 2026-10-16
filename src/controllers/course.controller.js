const db = require('../config/db');

exports.getAllCourses = (req, res) => {
  try {
    const { department = '', search = '' } = req.query;

    let query = `
      SELECT c.*, 
        t.first_name as teacher_first_name, 
        t.last_name as teacher_last_name,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as enrolled_count
      FROM courses c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (search.trim()) {
      query += ` AND (c.code LIKE ? OR c.title LIKE ? OR c.description LIKE ?)`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    if (department.trim()) {
      query += ` AND c.department = ?`;
      params.push(department.trim());
    }

    query += ` ORDER BY c.code ASC`;

    const courses = db.prepare(query).all(...params);
    res.json({ success: true, data: courses });
  } catch (error) {
    console.error('getAllCourses error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve courses.' });
  }
};

exports.getCourseById = (req, res) => {
  try {
    const { id } = req.params;
    const course = db.prepare(`
      SELECT c.*, 
        t.first_name as teacher_first_name, 
        t.last_name as teacher_last_name,
        t.email as teacher_email
      FROM courses c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      WHERE c.id = ?
    `).get(id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const students = db.prepare(`
      SELECT s.*, e.enrollment_date, e.status as enrollment_status,
             g.grade_letter, g.total_score
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      LEFT JOIN grades g ON g.student_id = s.id AND g.course_id = e.course_id
      WHERE e.course_id = ?
      ORDER BY s.last_name ASC
    `).all(id);

    res.json({ success: true, course, students });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve course details.' });
  }
};

exports.createCourse = (req, res) => {
  try {
    const { code, title, description, department, credits = 3, teacher_id, semester = 'Spring 2026' } = req.body;

    if (!code || !title || !department) {
      return res.status(400).json({ success: false, message: 'Course code, title, and department are required.' });
    }

    const insert = db.prepare(`
      INSERT INTO courses (code, title, description, department, credits, teacher_id, semester)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      code.trim().toUpperCase(),
      title.trim(),
      description || null,
      department.trim(),
      parseInt(credits) || 3,
      teacher_id || null,
      semester
    );

    res.status(201).json({ success: true, message: 'Course created successfully.', courseId: insert.lastInsertRowid });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed: courses.code')) {
      return res.status(400).json({ success: false, message: 'A course with this code already exists.' });
    }
    res.status(500).json({ success: false, message: 'Failed to create course.' });
  }
};

exports.updateCourse = (req, res) => {
  try {
    const { id } = req.params;
    const { code, title, description, department, credits, teacher_id, semester } = req.body;

    db.prepare(`
      UPDATE courses SET
        code = COALESCE(?, code),
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        department = COALESCE(?, department),
        credits = COALESCE(?, credits),
        teacher_id = COALESCE(?, teacher_id),
        semester = COALESCE(?, semester)
      WHERE id = ?
    `).run(
      code ? code.trim().toUpperCase() : null,
      title ? title.trim() : null,
      description !== undefined ? description : null,
      department ? department.trim() : null,
      credits !== undefined ? parseInt(credits) : null,
      teacher_id !== undefined ? (teacher_id ? parseInt(teacher_id) : null) : null,
      semester || null,
      id
    );

    res.json({ success: true, message: 'Course updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update course.' });
  }
};

exports.deleteCourse = (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM courses WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }
    res.json({ success: true, message: 'Course deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete course.' });
  }
};

exports.enrollStudent = (req, res) => {
  try {
    const { student_id, course_id } = req.body;
    if (!student_id || !course_id) {
      return res.status(400).json({ success: false, message: 'student_id and course_id are required.' });
    }

    db.prepare(`
      INSERT INTO enrollments (student_id, course_id, enrollment_date, status)
      VALUES (?, ?, CURRENT_DATE, 'Enrolled')
    `).run(student_id, course_id);

    res.status(201).json({ success: true, message: 'Student enrolled successfully.' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ success: false, message: 'Student is already enrolled in this course.' });
    }
    res.status(500).json({ success: false, message: 'Failed to enroll student.' });
  }
};

exports.unenrollStudent = (req, res) => {
  try {
    const { student_id, course_id } = req.body;
    const result = db.prepare(`
      DELETE FROM enrollments WHERE student_id = ? AND course_id = ?
    `).run(student_id, course_id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Enrollment record not found.' });
    }

    res.json({ success: true, message: 'Student dropped from course.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to unenroll student.' });
  }
};
