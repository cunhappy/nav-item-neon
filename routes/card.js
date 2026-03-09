const express = require('express');
const { pool } = require('../db');
const auth = require('./authMiddleware');
const router = express.Router();

// 获取指定菜单的卡片
router.get('/:menuId', async (req, res) => {
  const { subMenuId } = req.query;
  
  try {
    let result;
    if (subMenuId) {
      // 获取指定子菜单的卡片
      result = await pool.query(
        'SELECT id, menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, sort_order AS "order" FROM cards WHERE sub_menu_id = $1 ORDER BY "order"',
        [subMenuId]
      );
    } else {
      // 获取主菜单的卡片（不包含子菜单的卡片）
      result = await pool.query(
        'SELECT id, menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, sort_order AS "order" FROM cards WHERE menu_id = $1 AND sub_menu_id IS NULL ORDER BY "order"',
        [req.params.menuId]
      );
    }
    
    const rows = result.rows;
    rows.forEach(card => {
      if (!card.custom_logo_path) {
        card.display_logo = card.logo_url || (card.url.replace(/\/+$/, '') + '/favicon.ico');
      } else {
        card.display_logo = '/uploads/' + card.custom_logo_path;
      }
    });
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

// 新增、修改、删除卡片需认证
router.post('/', auth, async (req, res) => {
  const { menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, order } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO cards (menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [menu_id, sub_menu_id || null, title, url, logo_url, custom_logo_path, desc, order || 0]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

router.put('/:id', auth, async (req, res) => {
  const { menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, order } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE cards SET menu_id=$1, sub_menu_id=$2, title=$3, url=$4, logo_url=$5, custom_logo_path=$6, desc=$7, sort_order=$8 WHERE id=$9',
      [menu_id, sub_menu_id || null, title, url, logo_url, custom_logo_path, desc, order || 0, req.params.id]
    );
    res.json({ changed: result.rowCount });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM cards WHERE id=$1', [req.params.id]);
    res.json({ deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({error: err.message});
  }
});

module.exports = router;
