import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: { name?: string; email: string; password: string }) {
    const existing = await this.usersService.findByEmail(input.email);
    if (existing) throw new BadRequestException('E-mail já cadastrado.');

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await this.usersService.createUser({
      name: input.name,
      email: input.email,
      password: passwordHash,
    });

    const token = await this.signToken(user.id, user.email);

    return {
      user: { id: user.id, name: user.name, email: user.email },
      accessToken: token,
    };
  }

  async login(input: { email: string; password: string }) {
    const user = await this.usersService.findByEmail(input.email);
    if (!user) throw new UnauthorizedException('Credenciais inválidas.');

    const ok = await bcrypt.compare(input.password, user.password);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas.');

    const token = await this.signToken(user.id, user.email);

    return {
      user: { id: user.id, name: user.name, email: user.email },
      accessToken: token,
    };
  }

  private signToken(userId: string, email: string) {
    return this.jwtService.signAsync({
      sub: userId,
      email,
    });
  }
}
