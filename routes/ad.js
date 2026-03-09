const express = require('express');
const { pool } = require('../db');
const auth = require('./authMiddleware');
const router = express.Router();

// 获取广告
router.get('/', async (req, res) => {
  const { page, pageSize } = req.query;
  
  if (!page && !pageSize) {
    try {
      const result = await pool.query('SELECT * FROM ads');
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({error: err.message});
    }
  } else {
    const pageNum = parseInt(page) || 1;
    const size = parseInt(pageSize) || 10;
    const offset = (pageNum - 1) * size;
    
    try {
      const countResult = await pool.query('SELECT COUNT(*) as total FROM ads');
      const result = await pool.query('SELECT * FROM ads LIMIT $1 OFFSET $2', [size, offset]);
      
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

// 新增广告
router.post('/', auth, async (req, res) => {
  const { position, img, url } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO ads (position, img, url) VALUES ($1, $2, $3) RETURNING id',
      [position, img, url]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// 修改广告
router.put('/:id', auth, async (req, res) => {
  const { img, url } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE ads SET img=$1, url=$2 WHERE id=$3',
      [img, url, req.params.id]
    );
    res.json({ changed: result.rowCount });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// 删除广告
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM ads WHERE id=$1', [req.params.id]);
    res.json({ deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

module.exports = router;
