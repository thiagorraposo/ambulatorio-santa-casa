import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpErrorFilter } from './common/http/http-error.filter';

export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true,
    forbidNonWhitelisted: true }));
  app.useGlobalFilters(new HttpErrorFilter());
  app.enableShutdownHooks();
}
