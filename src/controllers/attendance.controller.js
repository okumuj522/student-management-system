const db = require('../config/db');

exports.getAttendance = (req, res) => {
  try {
    const { course_id, date, student_id } = req.query;

    let query = `
      SELECT a.*, 
        s.first_name, s.last_name, s.student_id_code,
        c.code as course_code, c.title as course_title
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN courses c ON a.course_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (course_id) {
      query += ` AND a.course_id = ?`;
      params.push(course_id);
    }
    if (date) {
      query += ` AND a.date = ?`;
      params.push(date);
    }
    if (student_id) {
      query += ` AND a.student_id = ?`;
      params.push(student_id);
    }

    query += ` ORDER BY a.date DESC, s.last_name ASC`;

    const records = db.prepare(query).all(...params);
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('getAttendance error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance records.' });
  }
};

// Batch mark attendance for a class on a date
exports.markBatchAttendance = (req, res) => {
  try {
    const { course_id, date, records } = req.body;
    // records: [ { student_id, status: 'Present'|'Absent'|'Late'|'Excused', remarks: '' } ]

    if (!course_id || !date || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'course_id, date, and an array of student records are required.'
      });
    }

    const upsertStmt = db.prepare(`
      INSERT INTO attendance (student_id, course_id, date, status, remarks)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(student_id, course_id, date) DO UPDATE SET
        status = excluded.status,
        remarks = excluded.remarks
    `);

    const runBatch = db.transaction((items) => {
      for (const item of items) {
        upsertStmt.run(
          item.student_id,
          course_id,
          date,
          item.status || 'Present',
          item.remarks || null
        );
      }
    });

    runBatch(records);

    res.json({ success: true, message: `Attendance marked successfully for ${records.length} students.` });
  } catch (error) {
    console.error('markBatchAttendance error:', error);
    res.status(500).json({ success: false, message: 'Failed to record attendance.' });
  }
};

// Get stats for a course on a date or summary
exports.getClassSheet = (req, res) => {
  try {
    const { course_id, date = new Date().toISOString().split('T')[0] } = req.query;

    if (!course_id) {
      return res.status(400).json({ success: false, message: 'course_id is required.' });
    }

    // List all enrolled students with attendance for that date if already marked
    const sheet = db.prepare(`
      SELECT 
        s.id as student_id,
        s.student_id_code,
        s.first_name,
        s.last_name,
        s.email,
        COALESCE(a.status, 'Present') as status,
        a.remarks
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      LEFT JOIN attendance a ON a.student_id = s.id AND a.course_id = e.course_id AND a.date = ?
      WHERE e.course_id = ?
      ORDER BY s.last_name ASC
    `).all(date, course_id);

    res.json({ success: true, course_id, date, sheet });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load class attendance sheet.' });
  }
};
