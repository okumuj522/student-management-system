const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

exports.login = (req, res) => {
  try {
    const { identifier, password } = req.body; // Can be email or username

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both username/email and password.'
      });
    }

    const user = db.prepare(`
      SELECT * FROM users WHERE email = ? OR username = ?
    `).get(identifier.trim().toLowerCase(), identifier.trim());

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.'
      });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.'
      });
    }

    // Check linked student or teacher ID
    let linkedProfile = null;
    if (user.role === 'student') {
      const student = db.prepare('SELECT id, student_id_code, department FROM students WHERE user_id = ?').get(user.id);
      if (student) linkedProfile = { type: 'student', ...student };
    } else if (user.role === 'teacher') {
      const teacher = db.prepare('SELECT id, teacher_id_code, department, designation FROM teachers WHERE user_id = ?').get(user.id);
      if (teacher) linkedProfile = { type: 'teacher', ...teacher };
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      student_id: linkedProfile && linkedProfile.type === 'student' ? linkedProfile.id : null,
      teacher_id: linkedProfile && linkedProfile.type === 'teacher' ? linkedProfile.id : null
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar: user.avatar,
        linkedProfile
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

exports.register = (req, res) => {
  try {
    const { username, email, password, full_name, role = 'student' } = req.body;

    if (!username || !email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'All fields (username, email, password, full_name) are required.'
      });
    }

    const allowedRoles = ['admin', 'teacher', 'student'];
    const assignedRole = allowedRoles.includes(role) ? role : 'student';

    // If non-admin registers, force student role unless requested from authenticated admin
    const finalRole = (req.user && req.user.role === 'admin') ? assignedRole : 'student';

    // Check existing
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email.toLowerCase(), username);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with that email or username already exists.'
      });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const insert = db.prepare(`
      INSERT INTO users (username, email, password, full_name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(username.trim(), email.trim().toLowerCase(), hashedPassword, full_name.trim(), finalRole);

    // If registered as student, auto-create a student record if requested
    let studentId = null;
    if (finalRole === 'student') {
      const code = 'STU-' + new Date().getFullYear() + '-' + String(insert.lastInsertRowid).padStart(3, '0');
      const names = full_name.trim().split(' ');
      const firstName = names[0];
      const lastName = names.slice(1).join(' ') || 'Student';
      
      const newStudent = db.prepare(`
        INSERT INTO students (user_id, student_id_code, first_name, last_name, email, department, enrollment_date, status)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_DATE, 'Active')
      `).run(insert.lastInsertRowid, code, firstName, lastName, email.trim().toLowerCase(), 'General Studies');
      studentId = newStudent.lastInsertRowid;
    }

    const tokenPayload = {
      id: insert.lastInsertRowid,
      username,
      email: email.toLowerCase(),
      role: finalRole,
      full_name,
      student_id: studentId
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id: insert.lastInsertRowid,
        username,
        email: email.toLowerCase(),
        full_name,
        role: finalRole
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

exports.getMe = (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, username, email, full_name, role, avatar, created_at FROM users WHERE id = ?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let linkedProfile = null;
    if (user.role === 'student') {
      linkedProfile = db.prepare('SELECT * FROM students WHERE user_id = ?').get(user.id);
    } else if (user.role === 'teacher') {
      linkedProfile = db.prepare('SELECT * FROM teachers WHERE user_id = ?').get(user.id);
    }

    res.json({
      success: true,
      user: {
        ...user,
        linkedProfile
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
};

exports.changePassword = (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }

    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newHash, req.user.id);

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update password.' });
  }
};

exports.getAllUsers = (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, username, email, full_name, role, created_at FROM users ORDER BY created_at DESC
    `).all();
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list users.' });
  }
};
