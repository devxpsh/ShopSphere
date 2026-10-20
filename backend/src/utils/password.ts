import bcrypt from 'bcryptjs';
import { env } from '../config/env';

const SALT_ROUNDS = env.NODE_ENV === 'test' ? 10 : 12;

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function verifyPassword(
  plainPassword: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}
