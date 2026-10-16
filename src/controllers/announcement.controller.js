const db = require('../config/db');

exports.getAllAnnouncements = (req, res) => {
  try {
    const announcements = db.prepare(`
      SELECT * FROM announcements ORDER BY created_at DESC LIMIT 30
    `).all();
    res.json({ success: true, data: announcements });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve announcements.' });
  }
};

exports.createAnnouncement = (req, res) => {
  try {
    const { title, content, category = 'General' } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required.' });
    }

    const insert = db.prepare(`
      INSERT INTO announcements (title, content, category, author_name, author_role)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      title.trim(),
      content.trim(),
      category,
      req.user.full_name || req.user.username,
      req.user.role
    );

    res.status(201).json({ success: true, message: 'Announcement published.', announcementId: insert.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to publish announcement.' });
  }
};

exports.deleteAnnouncement = (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Announcement not found.' });
    }
    res.json({ success: true, message: 'Announcement removed.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete announcement.' });
  }
};
