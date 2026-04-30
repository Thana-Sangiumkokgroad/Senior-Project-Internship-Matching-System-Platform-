const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// Create notification (internal use)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { user_id, title, message, type } = req.body;

    if (!user_id || !title || !message || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validTypes = ['application', 'interview', 'offer', 'message', 'matching', 'system', 'profile', 'job', 'update', 'form', 'registration'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid notification type' });
    }

    const result = await db.query(
      `INSERT INTO notifications (user_id, title, message, type, is_read)
       VALUES ($1, $2, $3, $4, false)
       RETURNING *`,
      [user_id, title, message, type]
    );

    res.status(201).json({
      message: 'Notification created',
      notification: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Get all notifications for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread notifications
router.get('/unread', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 AND is_read = false
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({
      unread_count: result.rows.length,
      notifications: result.rows
    });
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get notifications by type
router.get('/type/:type', authMiddleware, async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = ['application', 'interview', 'offer', 'message', 'matching', 'system', 'profile', 'job', 'update', 'form', 'registration'];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid notification type' });
    }

    const result = await db.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 AND type = $2
       ORDER BY created_at DESC`,
      [req.user.id, type]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notifications by type:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE notifications SET is_read = true
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE notifications SET is_read = true
       WHERE user_id = $1 AND is_read = false
       RETURNING id`,
      [req.user.id]
    );

    res.json({
      message: 'All notifications marked as read',
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Delete notification
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM notifications 
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Delete all notifications
router.delete('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM notifications 
       WHERE user_id = $1
       RETURNING id`,
      [req.user.id]
    );

    res.json({
      message: 'All notifications deleted',
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ error: 'Failed to delete notifications' });
  }
});

module.exports = router;
