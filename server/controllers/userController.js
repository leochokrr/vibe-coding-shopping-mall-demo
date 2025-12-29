const User = require('../models/User');
const bcrypt = require('bcrypt');

// Get all users
exports.getAll = async (req, res) => {
  try {
    const users = await User.find().select('-password'); // password 제외
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single user by ID
exports.getById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new user
exports.create = async (req, res) => {
  try {
    const { email, name, password, user_type, address, provider, providerId } = req.body;
    
    console.log('회원가입 요청 받음:', { email, name, user_type, provider, address: address || '없음' });
    
    // 소셜 로그인인 경우 비밀번호 불필요
    const isSocialSignup = provider && providerId;
    
    // 필수 필드 검증
    if (!email || !name || !user_type) {
      console.log('필수 필드 누락:', { email: !!email, name: !!name, user_type: !!user_type });
      return res.status(400).json({ 
        message: 'Email, name, and user_type are required' 
      });
    }

    // 일반 회원가입인 경우 비밀번호 필수
    if (!isSocialSignup && !password) {
      return res.status(400).json({ 
        message: 'Password is required for local signup' 
      });
    }

    // user_type 검증
    if (!['customer', 'admin'].includes(user_type)) {
      console.log('잘못된 user_type:', user_type);
      return res.status(400).json({ 
        message: 'user_type must be either "customer" or "admin"' 
      });
    }

    // provider 검증
    if (provider && !['local', 'google', 'facebook', 'apple'].includes(provider)) {
      return res.status(400).json({ 
        message: 'Invalid provider' 
      });
    }

    // 비밀번호 암호화 (일반 회원가입인 경우만)
    let hashedPassword = null;
    if (!isSocialSignup && password) {
      const saltRounds = 10; // 해시 강도
      hashedPassword = await bcrypt.hash(password, saltRounds);
      console.log('비밀번호 암호화 완료');
    }

    // 새 유저 생성
    const userData = {
      email,
      name,
      user_type,
      address: address || undefined,
      provider: provider || 'local'
    };

    if (hashedPassword) {
      userData.password = hashedPassword;
    }

    if (providerId) {
      userData.providerId = providerId;
    }

    const user = new User(userData);

    // 데이터베이스에 저장
    const savedUser = await user.save();
    console.log('유저 저장 성공:', savedUser._id, savedUser.email);
    
    // password 제외하고 응답
    const userResponse = savedUser.toObject();
    delete userResponse.password;
    
    res.status(201).json({
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('회원가입 에러:', error);
    
    if (error.code === 11000) {
      // 중복 이메일 에러
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(400).json({ message: error.message });
  }
};

// Update user
exports.update = async (req, res) => {
  try {
    const { email, name, password, user_type, address } = req.body;
    const updateData = {};

    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (password !== undefined) {
      // 비밀번호 업데이트 시 암호화
      const saltRounds = 10;
      updateData.password = await bcrypt.hash(password, saltRounds);
      console.log('비밀번호 업데이트 - 암호화 완료');
    }
    if (user_type !== undefined) {
      if (!['customer', 'admin'].includes(user_type)) {
        return res.status(400).json({ 
          message: 'user_type must be either "customer" or "admin"' 
        });
      }
      updateData.user_type = user_type;
    }
    if (address !== undefined) updateData.address = address;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(400).json({ message: error.message });
  }
};

// Delete user
exports.delete = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

