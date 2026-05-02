const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// Send message
router.post('/send', authMiddleware, async (req, res) => {
  const { receiver_id, content } = req.body;

  if (!receiver_id || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await db.query(
      `INSERT INTO messages (sender_id, receiver_id, content, is_read)
       VALUES ($1, $2, $3, false)
       RETURNING *`,
      [req.user.id, receiver_id, content]
    );

    res.status(201).json({
      message: 'Message sent successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get inbox (received messages)
router.get('/inbox', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT m.*,
        u.email AS sender_email,
        u.user_type AS sender_type,
        COALESCE(
          s.name,
          c.company_name,
          (SELECT sup.name FROM supervisors sup WHERE sup.user_id = u.id LIMIT 1),
          u.email
        ) AS sender_name,
        s.profile_image AS sender_photo,
        c.company_logo AS sender_logo
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       LEFT JOIN students s ON u.id = s.user_id AND u.user_type = 'student'
       LEFT JOIN companies c ON u.id = c.user_id AND u.user_type = 'company'
       WHERE m.receiver_id = $1
       ORDER BY m.sent_at DESC`,
      [req.user.id]
    );

    const rows = result.rows.map(row => ({
      ...row,
      sender_photo: row.sender_photo ? row.sender_photo.toString('base64') : null,
      sender_logo:  row.sender_logo  ? row.sender_logo.toString('base64')  : null,
    }));

    res.json(rows);
  } catch (error) {
    console.error('Error fetching inbox:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get sent messages
router.get('/sent', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT m.*,
        u.email AS recipient_email,
        COALESCE(
          s.name,
          c.company_name,
          (SELECT sup.name FROM supervisors sup WHERE sup.user_id = u.id LIMIT 1),
          u.email
        ) AS recipient_name
       FROM messages m
       JOIN users u ON m.receiver_id = u.id
       LEFT JOIN students s ON u.id = s.user_id AND u.user_type = 'student'
       LEFT JOIN companies c ON u.id = c.user_id AND u.user_type = 'company'
       WHERE m.sender_id = $1
       ORDER BY m.sent_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sent messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get conversation between two users
router.get('/conversation/:user_id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT m.*, 
        u1.email as sender_email,
        u2.email as recipient_email
       FROM messages m
       JOIN users u1 ON m.sender_id = u1.id
       JOIN users u2 ON m.receiver_id = u2.id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.sent_at ASC`,
      [req.user.id, req.params.user_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Mark message as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE messages SET is_read = true
       WHERE id = $1 AND receiver_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// Get unread count
router.get('/unread/count', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT COUNT(*) as count FROM messages WHERE receiver_id = $1 AND is_read = false`,
      [req.user.id]
    );

    res.json({ unread_count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Delete message
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM messages 
       WHERE id = $1 AND (sender_id = $2 OR receiver_id = $2)
       RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;
