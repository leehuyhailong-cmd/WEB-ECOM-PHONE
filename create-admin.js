'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const User = require('./src/models/User');

async function createAdmin() {
  await connectDB();

  const email = 'admin@phonestore.vn';
  const password = 'admin123';

  let user = await User.findOne({ email });
  if (user) {
    console.log('Admin đã tồn tại, cập nhật role + password...');
    user.role = 'admin';
    user.isActive = true;
    await user.setPassword(password);
    await user.save();
    console.log('Đã cập nhật tài khoản Admin thành công!');
  } else {
    user = new User({
      name: 'Quản trị viên',
      email,
      role: 'admin',
      isActive: true,
    });
    await user.setPassword(password);
    await user.save();
    console.log('Đã tạo tài khoản Admin mới thành công!');
  }

  console.log('--- ADMIN CREDENTIALS ---');
  console.log('Email:', email);
  console.log('Password:', password);
  process.exit(0);
}

createAdmin().catch(err => {
  console.error('Lỗi khi tạo admin:', err);
  process.exit(1);
});
