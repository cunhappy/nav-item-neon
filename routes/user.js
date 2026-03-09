const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../db');
const authMiddleware = require('./authMiddleware');
const router = express.Router();

// 获取当前用户信息
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = result.rows[0];
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.json({ data: user });
  } catch (err) {
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取当前用户详细信息（包括登录信息）
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, last_login_time, last_login_ip FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = result.rows[0];
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.json({
      last_login_time: user.last_login_time,
      last_login_ip: user.last_login_ip
    });
  } catch (err) {
    res.status(500).json({ message: '服务器错误' });
  }
});

// 修改密码
router.put('/password', authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: '请提供旧密码和新密码' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ message: '新密码长度至少6位' });
  }

  try {
    // 验证旧密码
    const userResult = await pool.query(
      'SELECT password FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userResult.rows[0];
    
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    const isValidPassword = bcrypt.compareSync(oldPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: '旧密码错误' });
    }
    
    // 更新密码
    const newPasswordHash = bcrypt.hashSync(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [newPasswordHash, req.user.id]
    );
    
    res.json({ message: '密码修改成功' });
  } catch (err) {
    res.status(500).json({ message: '密码更新失败' });
  }
});

// 获取所有用户（管理员功能）
router.get('/', authMiddleware, async (req, res) => {
  const { page, pageSize } = req.query;
  
  if (!page && !pageSize) {
    try {
      const result = await pool.query('SELECT id, username FROM users');
      res.json({ data: result.rows });
    } catch (err) {
      res.status(500).json({ message: '服务器错误' });
    }
  } else {
    const pageNum = parseInt(page) || 1;
    const size = parseInt(pageSize) || 10;
    const offset = (pageNum - 1) * size;
    
    try {
      const countResult = await pool.query('SELECT COUNT(*) as total FROM users');
      const result = await pool.query(
        'SELECT id, username FROM users LIMIT $1 OFFSET $2',
        [size, offset]
      );
      
      res.json({
        total: parseInt(countResult.rows[0].total),
        page: pageNum,
        pageSize: size,
        data: result.rows
      });
    } catch (err) {
      res.status(500).json({ message: '服务器错误' });
    }
  }
});

module.exports = router;
