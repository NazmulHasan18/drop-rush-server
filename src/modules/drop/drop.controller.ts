import { catchAsync } from '../../utils/catchAsync.js';
import { sendResponse } from '../../utils/sendResponse.js';
import { DropService } from './drop.service.js';

const getAllDrops = catchAsync(async (_req, res) => {
  const drops = await DropService.getAllDropsWithActivity();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Drops retrieved successfully',
    data: drops,
  });
});

const getDashboardSummary = catchAsync(async (_req, res) => {
  const summary = await DropService.getDashboardSummary();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Drop summary retrieved successfully',
    data: summary,
  });
});

const getDropById = catchAsync(async (req, res) => {
  const drop = await DropService.getDropById(req.params.dropId as string);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Drop retrieved successfully',
    data: drop,
  });
});

const createDrop = catchAsync(async (req, res) => {
  const drop = await DropService.createDrop(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Drop created successfully',
    data: drop,
  });
});

export const DropController = { getAllDrops, getDashboardSummary, getDropById, createDrop };
