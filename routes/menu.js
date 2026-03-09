const express = require('express');
const { pool } = require('../db');
const auth = require('./authMiddleware');
const router = express.Router();

// 获取所有菜单（包含子菜单）
router.get('/', async (req, res) => {
  const { page, pageSize } = req.query;
  
  if (!page && !pageSize) {
    // 获取主菜单
    try {
      const menusResult = await pool.query('SELECT id, name, sort_order AS "order" FROM menus ORDER BY "order"');
      const menus = menusResult.rows;
      
      // 为每个主菜单获取子菜单
      for (const menu of menus) {
        const subMenusResult = await pool.query(
          'SELECT id, parent_id, name, sort_order AS "order" FROM sub_menus WHERE parent_id = $1 ORDER BY "order"',
          [menu.id]
        );
        menu.subMenus = subMenusResult.rows;
      }
      
      res.json(menus);
    } catch (err) {
      res.status(500).json({error: err.message});
    }
  } else {
    const pageNum = parseInt(page) || 1;
    const size = parseInt(pageSize) || 10;
    const offset = (pageNum - 1) * size;
    
    try {
      const countResult = await pool.query('SELECT COUNT(*) as total FROM menus');
      const result = await pool.query(
        'SELECT id, name, sort_order AS "order" FROM menus ORDER BY "order" LIMIT $1 OFFSET $2',
        [size, offset]
      );
      
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

// 获取指定菜单的子菜单
router.get('/:id/submenus', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, parent_id, name, sort_order AS "order" FROM sub_menus WHERE parent_id = $1 ORDER BY "order"',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// 新增菜单需认证
router.post('/', auth, async (req, res) => {
  const { name, order } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO menus (name, sort_order) VALUES ($1, $2) RETURNING id',
      [name, order || 0]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

router.put('/:id', auth, async (req, res) => {
  const { name, order } = req.body;
  try {
    const result = await pool.query(
      'UPDATE menus SET name=$1, sort_order=$2 WHERE id=$3',
      [name, order || 0, req.params.id]
    );
    res.json({ changed: result.rowCount });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM menus WHERE id=$1', [req.params.id]);
    res.json({ deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// 子菜单相关API
router.post('/:id/submenus', auth, async (req, res) => {
  const { name, order } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO sub_menus (parent_id, name, sort_order) VALUES ($1, $2, $3) RETURNING id',
      [req.params.id, name, order || 0]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

router.put('/submenus/:id', auth, async (req, res) => {
  const { name, order } = req.body;
  try {
    const result = await pool.query(
      'UPDATE sub_menus SET name=$1, sort_order=$2 WHERE id=$3',
      [name, order || 0, req.params.id]
    );
    res.json({ changed: result.rowCount });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

router.delete('/submenus/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM sub_menus WHERE id=$1', [req.params.id]);
    res.json({ deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

module.exports = router;
