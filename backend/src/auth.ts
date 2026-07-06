import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    '[Zenith Backend] JWT_SECRET ausente ou fraco. Configure uma string aleatória de ' +
    'pelo menos 32 caracteres na variável de ambiente antes de iniciar o servidor.'
  );
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateToken(userId: string, email: string): string {
    return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
  }

  static verifyToken(token: string): { userId: string; email: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return { userId: decoded.userId, email: decoded.email };
    } catch {
      return null;
    }
  }
}
