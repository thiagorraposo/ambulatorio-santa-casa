import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { webcrypto } from 'node:crypto';

// JSDOM does not expose SubtleCrypto; browsers use the native Web Crypto API.
Object.defineProperty(crypto, 'subtle', { value: webcrypto.subtle, configurable: true });

afterEach(() => cleanup());
