import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthenticatedUser } from './auth.types';
import { CurrentUser } from './current-user.decorator';
import { TrocarSenhaDto } from './dto/senha.dto';
import { LoginDto } from './dto/login.dto';
import { LoginResponse } from './dto/login.response';
import { Perfis } from './perfis.decorator';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  login(@Body() input: LoginDto): Promise<LoginResponse> {
    return this.auth.login(input.login, input.senha);
  }

  @Post('senha')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Perfis('consulta', 'edicao', 'administracao')
  changePassword(@Body() dto: TrocarSenhaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.auth.changePassword(user, dto.senhaAtual, dto.novaSenha);
  }

  @Get('me')
  @Perfis('consulta', 'edicao', 'administracao')
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser { return user; }

  @Perfis('edicao', 'administracao')
  @Get('authorization-check')
  authorizationCheck(@CurrentUser() user: AuthenticatedUser): { authorized: true; perfil: string } {
    return { authorized: true, perfil: user.perfil };
  }
}
