import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'mailol-default-dev-secret-key';
const EXPIRY = parseInt(process.env.JWT_EXPIRY || '3600'); // 1 hour

export interface TokenPayload {
  id: string;
  address: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRY });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}
