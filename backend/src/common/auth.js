import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../infrastructure/prisma/client.js';
import { AppError, asyncHandler } from './errors.js';

const secret = () => env.JWT_SECRET || 'development-only-jwt-secret-change-me-123456';

export const signAccessToken = (userId) =>
  jwt.sign({ sub: userId }, secret(), { expiresIn: env.JWT_EXPIRES_IN });

export const authenticate = asyncHandler(async (request, _response, next) => {
  const [scheme, token] = (request.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token)
    throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required');
  let payload;
  try {
    payload = jwt.verify(token, secret());
  } catch {
    throw new AppError(401, 'INVALID_ACCESS_TOKEN', 'Access token is invalid or expired');
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { platformRoles: true },
  });
  if (!user || user.status !== 'ACTIVE')
    throw new AppError(401, 'ACCOUNT_UNAVAILABLE', 'Account is unavailable');
  request.principal = { user, platformRoles: user.platformRoles.map((item) => item.role) };
  next();
});

export const requirePlatformRole = (role) => (request, _response, next) => {
  if (!request.principal.platformRoles.includes(role))
    return next(new AppError(403, 'FORBIDDEN', 'Insufficient permission'));
  next();
};

export async function requireFarmAccess(userId, farmId, allowedRoles) {
  const membership = await prisma.farmMember.findUnique({
    where: { farmId_userId: { farmId, userId } },
    include: { roles: true },
  });
  if (!membership || membership.status !== 'ACTIVE')
    throw new AppError(404, 'FARM_NOT_FOUND', 'Farm not found');
  const roles = membership.roles.map((item) => item.role);
  if (allowedRoles && !allowedRoles.some((role) => roles.includes(role)))
    throw new AppError(403, 'FORBIDDEN', 'Farm permission denied');
  return { membership, roles };
}
