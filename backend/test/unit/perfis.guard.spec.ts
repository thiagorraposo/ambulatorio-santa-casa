import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PerfisGuard } from '../../src/auth/perfis.guard';
import { Perfis } from '../../src/auth/perfis.decorator';
import { Public } from '../../src/auth/public.decorator';

@Perfis('consulta', 'edicao', 'administracao')
class ExplicitController {
  read() {}
  @Perfis('administracao') write() {}
}
class MissingController {
  read() {}
  @Public() health() {}
}

describe('Política explícita de perfis', () => {
  const guard = new PerfisGuard(new Reflector());
  const context = (controller: typeof ExplicitController | typeof MissingController, method: string, perfil?: string) => ({
    getClass: () => controller, getHandler: () => controller.prototype[method as keyof typeof controller.prototype],
    switchToHttp: () => ({ getRequest: () => ({ user: perfil ? { perfil } : undefined }) }),
  }) as unknown as ExecutionContext;
  it('recusa rota privada sem metadados mesmo com usuário autenticado', () => {
    expect(() => guard.canActivate(context(MissingController, 'read', 'administracao'))).toThrow(ForbiddenException);
  });
  it('permite somente rotas explicitamente públicas sem perfil', () => {
    expect(guard.canActivate(context(MissingController, 'health'))).toBe(true);
  });
  it('herda política da classe e aplica a restrição específica da operação', () => {
    for (const perfil of ['consulta', 'edicao', 'administracao']) expect(guard.canActivate(context(ExplicitController, 'read', perfil))).toBe(true);
    for (const perfil of ['consulta', 'edicao']) expect(() => guard.canActivate(context(ExplicitController, 'write', perfil))).toThrow(ForbiddenException);
    expect(guard.canActivate(context(ExplicitController, 'write', 'administracao'))).toBe(true);
    expect(() => guard.canActivate(context(ExplicitController, 'read'))).toThrow(ForbiddenException);
  });
});
