const db = require('../config/db');

function calculateGradeLetter(total) {
  if (total >= 90) return 'A';
  if (total >= 80) return 'B';
  if (total >= 70) return 'C';
  if (total >= 60) return 'D';
  return 'F';
}

function gradeToPoints(letter) {
  switch (letter) {
    case 'A': return 4.0;
    case 'B': return 3.0;
    case 'C': return 2.0;
    case 'D': return 1.0;
    default: return 0.0;
  }
}

exports.getGrades = (req, res) => {
  try {
    const { course_id, student_id } = req.query;

    let query = `
      SELECT g.*, 
        s.first_name, s.last_name, s.student_id_code,
        c.code as course_code, c.title as course_title, c.credits
      FROM grades g
      JOIN students s ON g.student_id = s.id
      JOIN courses c ON g.course_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (course_id) {
      query += ` AND g.course_id = ?`;
      params.push(course_id);
    }
    if (student_id) {
      query += ` AND g.student_id = ?`;
      params.push(student_id);
    }

    query += ` ORDER BY s.last_name ASC`;

    const records = db.prepare(query).all(...params);
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('getGrades error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve grades.' });
  }
};

exports.upsertGrade = (req, res) => {
  try {
    const {
      student_id,
      course_id,
      assignment_score = 0,
      midterm_score = 0,
      final_score = 0,
      remarks = '',
      term = 'Spring 2026'
    } = req.body;

    if (!student_id || !course_id) {
      return res.status(400).json({ success: false, message: 'student_id and course_id are required.' });
    }

    // Weighted: 20% Assignments, 30% Midterm, 50% Final
    const a = parseFloat(assignment_score) || 0;
    const m = parseFloat(midterm_score) || 0;
    const f = parseFloat(final_score) || 0;

    const total_score = Math.round((a * 0.2 + m * 0.3 + f * 0.5) * 10) / 10;
    const grade_letter = calculateGradeLetter(total_score);

    const upsert = db.prepare(`
      INSERT INTO grades (
        student_id, course_id, assignment_score, midterm_score,
        final_score, total_score, grade_letter, remarks, term
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(student_id, course_id) DO UPDATE SET
        assignment_score = excluded.assignment_score,
        midterm_score = excluded.midterm_score,
        final_score = excluded.final_score,
        total_score = excluded.total_score,
        grade_letter = excluded.grade_letter,
        remarks = excluded.remarks,
        term = excluded.term
    `);

    upsert.run(
      student_id,
      course_id,
      a,
      m,
      f,
      total_score,
      grade_letter,
      remarks,
      term
    );

    res.json({
      success: true,
      message: 'Grade saved successfully.',
      data: {
        student_id,
        course_id,
        assignment_score: a,
        midterm_score: m,
        final_score: f,
        total_score,
        grade_letter,
        remarks
      }
    });
  } catch (error) {
    console.error('upsertGrade error:', error);
    res.status(500).json({ success: false, message: 'Failed to record grade.' });
  }
};

exports.getTranscript = (req, res) => {
  try {
    const { studentId } = req.params;

    const student = db.prepare(`
      SELECT s.*, u.username 
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `).get(studentId);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const courseGrades = db.prepare(`
      SELECT 
        c.code, c.title, c.credits, c.semester,
        COALESCE(g.assignment_score, 0) as assignment_score,
        COALESCE(g.midterm_score, 0) as midterm_score,
        COALESCE(g.final_score, 0) as final_score,
        COALESCE(g.total_score, 0) as total_score,
        COALESCE(g.grade_letter, 'N/A') as grade_letter,
        COALESCE(g.remarks, '') as remarks
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN grades g ON g.student_id = e.student_id AND g.course_id = c.id
      WHERE e.student_id = ?
      ORDER BY c.code ASC
    `).all(studentId);

    // Calculate GPA
    let totalQualityPoints = 0;
    let totalGradedCredits = 0;

    courseGrades.forEach(item => {
      if (item.grade_letter && item.grade_letter !== 'N/A') {
        const points = gradeToPoints(item.grade_letter);
        totalQualityPoints += points * item.credits;
        totalGradedCredits += item.credits;
      }
    });

    const gpa = totalGradedCredits > 0 
      ? (totalQualityPoints / totalGradedCredits).toFixed(2) 
      : '0.00';

    res.json({
      success: true,
      student,
      gpa,
      totalCredits: totalGradedCredits,
      courses: courseGrades,
      generatedDate: new Date().toLocaleDateString()
    });
  } catch (error) {
    console.error('getTranscript error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate transcript.' });
  }
};
