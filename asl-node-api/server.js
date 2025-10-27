require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const User = require('./models/User');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: 'http://localhost:8080', // React frontend URL
    credentials: true // Allow credentials (cookies)
}));

// JWT secrets (use environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret';

// MongoDB connection
const MONGODB_URI = 'mongodb://127.0.0.1:27017/signlang';
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log(`🔗 Connected to MongoDB at ${MONGODB_URI}`))
    .catch(err => console.error('MongoDB connection error:', err));

// Generate access token
const generateAccessToken = (user) => {
    return jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
};

// Generate refresh token
const generateRefreshToken = (user) => {
    return jwt.sign(
        { id: user.id, username: user.username },
        REFRESH_TOKEN_SECRET,
        { expiresIn: '7d' }
    );
};

// Registration endpoint
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, role = 'user' } = req.body;

        if (!username || !password) return res.status(400).json({ success: false, message: 'username and password required' });

        // Check if user already exists in MongoDB
        const existing = await User.findOne({ username }).exec();
        if (existing) return res.status(400).json({ success: false, message: 'User already exists' });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create and save user
        const userDoc = new User({ username, password_hash: hashedPassword, role });
        await userDoc.save();

        const user = { id: userDoc._id.toString(), username: userDoc.username, role: userDoc.role };

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Set refresh token in HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(201).json({ success: true, message: 'User registered successfully', user, accessToken });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Error registering user' });
    }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        // Check if user exists in MongoDB
        const userDoc = await User.findOne({ username }).exec();
        if (!userDoc) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        // Verify password (stored as password_hash)
        const validPassword = await bcrypt.compare(password, userDoc.password_hash);
        if (!validPassword) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const user = { id: userDoc._id.toString(), username: userDoc.username, role: userDoc.role };

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Set refresh token in HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Update last_activity
        userDoc.last_activity_at = new Date();
        await userDoc.save();

        res.json({ success: true, message: 'Login successful', user, accessToken });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging in'
        });
    }
});

// Refresh token endpoint
app.post('/api/auth/refresh-token', async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({
            success: false,
            message: 'Refresh token not found'
        });
    }

    try {
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    const userDoc = await User.findOne({ username: decoded.username }).exec();

    if (!userDoc) return res.status(401).json({ success: false, message: 'User not found' });

    // Generate new access token
    const user = { id: userDoc._id.toString(), username: userDoc.username, role: userDoc.role };
    const accessToken = generateAccessToken(user);

    res.json({ success: true, accessToken });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('refreshToken');
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Protected route example (reads user from MongoDB)
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
    try {
        const username = req.user && req.user.username;
        if (!username) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const userDoc = await User.findOne({ username }).exec();
        if (!userDoc) return res.status(404).json({ success: false, message: 'User not found' });

        const user = { id: userDoc._id.toString(), username: userDoc.username, role: userDoc.role, active: userDoc.active, blocked: userDoc.blocked, last_activity_at: userDoc.last_activity_at };
        res.json({ success: true, user });
    } catch (err) {
        console.error('Profile error:', err);
        res.status(500).json({ success: false, message: 'Error fetching profile' });
    }
});

// Middleware to authenticate JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token not found'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Invalid token'
            });
        }
        req.user = user;
        next();
    });
}

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`🚀 Auth server running on http://localhost:${PORT}`);
});