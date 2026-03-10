const express = require('express');
const { pool } = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const router = express.Router();

function getClientIp(req) {
  let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
  if (typeof ip === 'string' && ip.includes(',')) ip = ip.split(',')[0].trim();
  if (typeof ip === 'string' && ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
  return ip;
}

function getShanghaiTime() {
  const date = new Date();
  const shanghaiTime = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Shanghai"}));
  const year = shanghaiTime.getFullYear();
  const month = String(shanghaiTime.getMonth() + 1).padStart(2, '0');
  const day = String(shanghaiTime.getDate()).padStart(2, '0');
  const hours = String(shanghaiTime.getHours()).padStart(2, '0');
  const minutes = String(shanghaiTime.getMinutes()).padStart(2, '0');
  const seconds = String(shanghaiTime.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
    const user = result.rows[0];
    
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (passwordMatch) {
      // 记录上次登录时间和IP
      const lastLoginTime = user.last_login_time;
      const lastLoginIp = user.last_login_ip;
      
      // 更新为本次登录（上海时间）
      const now = getShanghaiTime();
      const ip = getClientIp(req);
      
      await pool.query(
        'UPDATE users SET last_login_time=$1, last_login_ip=$2 WHERE id=$3',
        [now, ip, user.id]
      );
      
      const token = jwt.sign(
        { id: user.id, username: user.username },
        config.server.jwtSecret,
        { expiresIn: '7d' }
      );
      
      res.json({ token, lastLoginTime, lastLoginIp });
    } else {
      res.status(401).json({ error: '用户名或密码错误' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
