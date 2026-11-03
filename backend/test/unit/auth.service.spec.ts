import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
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

  it('não registra login, senha, hash ou token em sucesso e falha', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    repository.findByLogin.mockResolvedValueOnce({ usuario_id: '7', nome: 'Sintetico',
      login: 'sigiloso@example.invalid', senha_hash: await hash('SenhaSintetica123!', 4),
      perfil: 'consulta', ativo: true });
    await service.login('sigiloso@example.invalid', 'SenhaSintetica123!');
    repository.findByLogin.mockResolvedValueOnce(undefined);
    await expect(service.login('ausente@example.invalid', 'SenhaIncorreta123!')).rejects.toBeInstanceOf(UnauthorizedException);

    const serialized = [...log.mock.calls, ...warn.mock.calls]
      .map(([message]) => String(message)).join('\n');
    expect(serialized).toContain('"userId":"7"');
    expect(serialized).not.toMatch(/sigiloso|ausente|Senha|senha_hash|token-sintetico/);
    log.mockRestore();
    warn.mockRestore();
  });
});


describe('AuthService revogação por geração', () => {
  const repository = { findByLogin: jest.fn(), findActiveById: jest.fn() };
  const jwt = { signAsync: jest.fn().mockResolvedValue('token') };
  const config = { get: jest.fn().mockReturnValue(900) };
  const service = new AuthService(repository as unknown as AuthRepository, jwt as unknown as JwtService,
    config as unknown as ConfigService<AppConfig, true>);
  it('aceita legado somente na geração zero e rejeita JWT anterior mesmo após restauração de perfil', async () => {
    const user = { usuario_id: '9', nome: 'Sintético', perfil: 'administracao', login: 'sintetico', ativo: true };
    repository.findActiveById.mockResolvedValue({ ...user, geracao_sessao: '0' });
    expect(await service.resolveIdentity({ sub: '9', typ: 'access' })).toMatchObject({ usuarioId: '9' });
    repository.findActiveById.mockResolvedValue({ ...user, geracao_sessao: '2' });
    expect(await service.resolveIdentity({ sub: '9', typ: 'access' })).toBeUndefined();
    expect(await service.resolveIdentity({ sub: '9', typ: 'access', ver: '1' })).toBeUndefined();
    const identity = await service.resolveIdentity({ sub: '9', typ: 'access', ver: '2' });
    expect(JSON.parse(JSON.stringify(identity))).toEqual({ usuarioId: '9', nome: 'Sintético', perfil: 'administracao', login: 'sintetico', ativo: true });
  });
  it('login inclui geração atual sem expor hash ou perfil no payload', async () => {
    repository.findByLogin.mockResolvedValue({ usuario_id: '9', ativo: true, geracao_sessao: '4',
      senha_hash: await hash('Sintetica123!', 4) });
    await service.login('sintetico', 'Sintetica123!');
    expect(jwt.signAsync).toHaveBeenLastCalledWith({ sub: '9', typ: 'access', ver: '4' });
  });
});
