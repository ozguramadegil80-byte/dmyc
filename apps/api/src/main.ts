import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

loadEnvFile();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const port = Number(process.env.PORT ?? 4311);

  try {
    await app.listen(port);
  } catch (error) {
    if (isPortInUseError(error)) {
      console.error(
        `DMyC API port ${port} is already in use. Reuse the running API or run "npm run dev:free-ports" before starting again.`,
      );
      process.exit(0);
    }

    throw error;
  }
}

bootstrap();

function isPortInUseError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'EADDRINUSE'
  );
}

function loadEnvFile() {
  const envPath = findEnvPath();

  if (!envPath) {
    return;
  }

  const content = readFileSync(envPath, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = normalizeEnvValue(line.slice(separatorIndex + 1).trim());

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function findEnvPath() {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '..', '..', '.env'),
    resolve(__dirname, '..', '..', '..', '.env'),
    resolve(__dirname, '..', '..', '..', '..', '.env'),
  ];

  return candidates.find((candidate) => existsSync(candidate));
}

function normalizeEnvValue(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
