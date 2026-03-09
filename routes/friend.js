const express = require('express');
const { pool } = require('../db');
const auth = require('./authMiddleware');
const router = express.Router();

// 获取友链
router.get('/', async (req, res) => {
  const { page, pageSize } = req.query;
  
  if (!page && !pageSize) {
    try {
      const result = await pool.query('SELECT * FROM friends');
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({error: err.message});
    }
  } else {
    const pageNum = parseInt(page) || 1;
    const size = parseInt(pageSize) || 10;
    const offset = (pageNum - 1) * size;
    
    try {
      const countResult = await pool.query('SELECT COUNT(*) as total FROM friends');
      const result = await pool.query('SELECT * FROM friends LIMIT $1 OFFSET $2', [size, offset]);
      
      res.json({
        total: parseInt(countResult.rows[0].total),
        page: pageNum,
        pageSize: size,
        data: result.rows
      });
    } catch (err) {
      res.status(500).json({error: err.message});
    }
  }
});

// 新增友链
router.post('/', auth, async (req, res) => {
  const { title, url, logo } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO friends (title, url, logo) VALUES ($1, $2, $3) RETURNING id',
      [title, url, logo]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// 修改友链
router.put('/:id', auth, async (req, res) => {
  const { title, url, logo } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE friends SET title=$1, url=$2, logo=$3 WHERE id=$4',
      [title, url, logo, req.params.id]
    );
    res.json({ changed: result.rowCount });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// 删除友链
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM friends WHERE id=$1', [req.params.id]);
    res.json({ deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

module.exports = router;
