import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { User } from '../../db/models/index.js';
import { AppError } from '../../utils/AppError.js';
import { config } from '../../config/index.js';
import type { LoginInput, RegisterInput } from './auth.validation.js';

const signToken = (userId: string, username: string): string => {
  const options: SignOptions = { expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'] };
  return jwt.sign({ userId, username }, config.jwt.secret, options);
};

const register = async (payload: RegisterInput) => {
  const existing = await User.findOne({ where: { username: payload.username } });
  if (existing) {
    throw new AppError(409, 'Username is already taken');
  }

  const passwordHash = await bcrypt.hash(payload.password, 12);
  const user = await User.create({ username: payload.username, passwordHash });

  const token = signToken(user.id, user.username);
  return { token, user: { id: user.id, username: user.username } };
};

const login = async (payload: LoginInput) => {
  const user = await User.findOne({ where: { username: payload.username } });
  if (!user) {
    throw new AppError(401, 'Invalid username or password');
  }

  const isValid = await bcrypt.compare(payload.password, user.passwordHash);
  if (!isValid) {
    throw new AppError(401, 'Invalid username or password');
  }

  const token = signToken(user.id, user.username);
  return { token, user: { id: user.id, username: user.username } };
};

export const AuthService = { register, login };
