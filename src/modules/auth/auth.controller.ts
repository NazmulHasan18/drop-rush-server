import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { AppError } from '../../utils/AppError.js';
import { AuthService } from './auth.service.js';

const register = catchAsync(async (req, res) => {
  const result = await AuthService.register(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'User registered successfully',
    data: result,
  });
});

const login = catchAsync(async (req, res) => {
  const result = await AuthService.login(req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Logged in successfully',
    data: result,
  });
});

const me = catchAsync(async (req, res) => {
  if (!req.user) throw new AppError(401, 'Unauthorized');

  const user = await AuthService.getCurrentUser(req.user.userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Current user retrieved successfully',
    data: user,
  });
});

export const AuthController = { register, login, me };
