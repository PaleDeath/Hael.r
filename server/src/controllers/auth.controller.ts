import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/user.model';

// Generate JWT token
const generateToken = (user: IUser) => {
  const jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret';
  const expiresIn = process.env.JWT_EXPIRATION || '7d';
  
  return jwt.sign({ id: user._id }, jwtSecret, { expiresIn });
};

// Register a new user
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName
    });

    await user.save();

    // Generate token
    const token = generateToken(user);

    // Return user data without password
    const userData = {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    };

    res.status(201).json({
      success: true,
      data: {
        user: userData,
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during registration'
    });
  }
};

// Login user
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user);

    // Return user data without password
    const userData = {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    };

    res.status(200).json({
      success: true,
      data: {
        user: userData,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login'
    });
  }
};

// Get current user
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user data'
    });
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      },
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating profile'
    });
  }
}; 