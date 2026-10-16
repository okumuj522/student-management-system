const db = require('../config/db');

exports.getDashboardStats = (req, res) => {
  try {
    const role = req.user.role;

    if (role === 'admin') {
      const studentCount = db.prepare('SELECT COUNT(*) as c FROM students').get().c;
      const teacherCount = db.prepare('SELECT COUNT(*) as c FROM teachers').get().c;
      const courseCount = db.prepare('SELECT COUNT(*) as c FROM courses').get().c;
      const enrollmentCount = db.prepare('SELECT COUNT(*) as c FROM enrollments').get().c;

      // Attendance rate
      const attRate = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('Present', 'Late') THEN 1 ELSE 0 END) as attended
        FROM attendance
      `).get();
      const attendancePercent = attRate.total > 0 ? Math.round((attRate.attended / attRate.total) * 100) : 100;

      // Fees stats
      const feeStats = db.prepare(`
        SELECT 
          COALESCE(SUM(amount), 0) as total_billed,
          COALESCE(SUM(paid_amount), 0) as total_collected,
          COALESCE(SUM(amount - paid_amount), 0) as total_outstanding
        FROM fees
      `).get();

      // Department distribution
      const deptDistribution = db.prepare(`
        SELECT department, COUNT(*) as count 
        FROM students 
        GROUP BY department 
        ORDER BY count DESC
      `).all();

      // Grade distribution
      const gradeDistribution = db.prepare(`
        SELECT 
          grade_letter, COUNT(*) as count
        FROM grades
        WHERE grade_letter IS NOT NULL
        GROUP BY grade_letter
        ORDER BY grade_letter ASC
      `).all();

      // Recent 5 students
      const recentStudents = db.prepare(`
        SELECT id, student_id_code, first_name, last_name, department, enrollment_date, status
        FROM students
        ORDER BY id DESC
        LIMIT 5
      `).all();

      return res.json({
        success: true,
        stats: {
          studentCount,
          teacherCount,
          courseCount,
          enrollmentCount,
          attendancePercent,
          feeStats,
          deptDistribution,
          gradeDistribution,
          recentStudents
        }
      });
    }

    if (role === 'teacher') {
      // Find teacher id
      const teacher = db.prepare('SELECT id FROM teachers WHERE user_id = ?').get(req.user.id);
      const teacherId = teacher ? teacher.id : null;

      const myCourses = teacherId ? db.prepare(`
        SELECT c.*, 
          (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as enrolled_count
        FROM courses c 
        WHERE c.teacher_id = ?
      `).all(teacherId) : [];

      const totalStudentsAssigned = teacherId ? db.prepare(`
        SELECT COUNT(DISTINCT e.student_id) as count
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE c.teacher_id = ?
      `).get(teacherId).count : 0;

      return res.json({
        success: true,
        stats: {
          teacherId,
          courseCount: myCourses.length,
          studentCount: totalStudentsAssigned,
          myCourses
        }
      });
    }

    if (role === 'student') {
      const student = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
      if (!student) {
        return res.json({ success: true, stats: { error: 'No student record linked.' } });
      }

      const enrolledCoursesCount = db.prepare('SELECT COUNT(*) as c FROM enrollments WHERE student_id = ?').get(student.id).c;
      
      const attStats = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('Present', 'Late') THEN 1 ELSE 0 END) as attended
        FROM attendance
        WHERE student_id = ?
      `).get(student.id);

      const attendancePercent = attStats.total > 0 ? Math.round((attStats.attended / attStats.total) * 100) : 100;

      const feeSummary = db.prepare(`
        SELECT 
          COALESCE(SUM(amount), 0) as total,
          COALESCE(SUM(paid_amount), 0) as paid,
          COALESCE(SUM(amount - paid_amount), 0) as balance
        FROM fees
        WHERE student_id = ?
      `).get(student.id);

      return res.json({
        success: true,
        stats: {
          studentId: student.id,
          enrolledCoursesCount,
          attendancePercent,
          attendanceTotalDays: attStats.total,
          feeSummary
        }
      });
    }

    res.json({ success: true, stats: {} });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    res.status(500).json({ success: false, message: 'Failed to load dashboard statistics.' });
  }
};
