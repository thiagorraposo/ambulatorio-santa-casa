import { INestApplication, VERSION_NEUTRAL, ValidationPipe, VersioningType } from '@nestjs/common';
import { HttpErrorFilter } from './common/http/http-error.filter';

export function configureApp(app: INestApplication): void {
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: ['1', VERSION_NEUTRAL] });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true,
    forbidNonWhitelisted: true }));
  app.useGlobalFilters(new HttpErrorFilter());
  app.enableShutdownHooks();
}
