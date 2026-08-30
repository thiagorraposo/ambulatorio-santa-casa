import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { AuthService } from '../../src/auth/auth.service';
import { AuthRepository } from '../../src/auth/auth.repository';
import { AppConfig } from '../../src/config/app.config';

describe('AuthService', () => {
  const repository = { findByLogin: jest.fn(), findActiveById: jest.fn() };
  const jwt = { signAsync: jest.fn().mockResolvedValue('token-sintetico') };
  const config = { get: jest.fn().mockReturnValue(900) };
  const service = new AuthService(repository as unknown as AuthRepository,
    jwt as unknown as JwtService, config as unknown as ConfigService<AppConfig, true>);

  beforeEach(() => jest.clearAllMocks());

  it('emite token para senha válida e usuário ativo sem devolver hash', async () => {
    repository.findByLogin.mockResolvedValue({ usuario_id: '1', nome: 'Usuario Sintetico',
      login: 'consulta@example.invalid', senha_hash: await hash('SenhaSintetica123!', 4),
      perfil: 'consulta', ativo: true });
    await expect(service.login('CONSULTA@example.invalid', 'SenhaSintetica123!')).resolves.toEqual({
      accessToken: 'token-sintetico', tokenType: 'Bearer', expiresIn: 900,
    });
    expect(repository.findByLogin).toHaveBeenCalledWith('consulta@example.invalid');
  });

  it.each([
    ['senha incorreta', { usuario_id: '1', senha_hash: '$2b$04$M6pTQHfVtRjDcjf9q2Kiq.KxY8WPlHh5BXtY9c2Qv7FSqPwVXqz12', ativo: true }],
    ['usuário inexistente', undefined],
    ['usuário inativo', { usuario_id: '2', senha_hash: '$2b$04$M6pTQHfVtRjDcjf9q2Kiq.KxY8WPlHh5BXtY9c2Qv7FSqPwVXqz12', ativo: false }],
  ])('usa a mesma resposta externa para %s', async (_case, user) => {
    repository.findByLogin.mockResolvedValue(user);
    await expect(service.login('alguem@example.invalid', 'senha-errada'))
      .rejects.toEqual(new UnauthorizedException('Credenciais inválidas'));
  });
});
