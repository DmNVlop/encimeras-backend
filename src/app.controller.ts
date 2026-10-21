import { Controller, Get } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AppService } from './app.service';

/** Versión del package.json (src/ y dist/ cuelgan de la raíz del BE): no depende de arrancar con npm. */
const APP_VERSION: string = (() => {
  try {
    return JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')).version;
  } catch {
    return process.env.npm_package_version ?? '0.0.0';
  }
})();

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get('version')
  getVersion() {
    return {
      version: APP_VERSION,
      environment: process.env.NODE_ENV ?? 'development',
    };
  }
}
