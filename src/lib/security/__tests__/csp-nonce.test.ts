import { describe, expect, it, jest } from '@jest/globals';

import {
  generateCSPHeader,
  generateFullCSPHeader,
  generateNonce,
  getCSPReportUri,
} from '../csp-nonce';

describe('CSP Nonce', () => {
  describe('generateNonce', () => {
    it('should generate a valid base64 nonce', () => {
      const nonce = generateNonce();
      expect(nonce).toMatch(/^[A-Za-z0-9_-]+$/); // Base64url format
      expect(nonce.length).toBeGreaterThanOrEqual(20);
    });

    it('should generate unique nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      expect(nonce1).not.toBe(nonce2);
    });

    it('should not contain standard base64 padding', () => {
      const nonce = generateNonce();
      expect(nonce).not.toContain('=');
      expect(nonce).not.toContain('+');
      expect(nonce).not.toContain('/');
    });
  });

  describe('generateCSPHeader', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should generate development CSP with unsafe-inline', () => {
      process.env.NODE_ENV = 'development';
      const csp = generateCSPHeader();

      expect(csp).toContain("script-src 'self' 'unsafe-eval' 'unsafe-inline'");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
      expect(csp).not.toContain('nonce');
      expect(csp).not.toContain('upgrade-insecure-requests');
    });

    it('should generate production CSP with nonce', () => {
      process.env.NODE_ENV = 'production';
      const nonce = 'test-nonce-123';
      const csp = generateCSPHeader(nonce);

      expect(csp).toContain(`script-src 'self' 'nonce-${nonce}'`);
      expect(csp).toContain(`script-src-elem 'self' 'nonce-${nonce}'`);
      expect(csp).not.toContain('unsafe-eval');
      expect(csp).toContain('upgrade-insecure-requests');
    });

    it('should include necessary external domains', () => {
      const csp = generateCSPHeader();

      expect(csp).toContain('supabase.co');
      expect(csp).toContain('ingest.sentry.io');
      expect(csp).toContain('upstash.com');
    });

    it('should set security directives', () => {
      const csp = generateCSPHeader();

      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
      expect(csp).toContain("object-src 'none'");
    });
  });

  describe('getCSPReportUri', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return undefined in development', () => {
      process.env.NODE_ENV = 'development';
      expect(getCSPReportUri()).toBeUndefined();
    });

    it('should use CSP_REPORT_URI if set', () => {
      process.env.NODE_ENV = 'production';
      process.env.CSP_REPORT_URI = 'https://example.com/csp-report';

      expect(getCSPReportUri()).toBe('https://example.com/csp-report');
    });

    it('should generate Sentry URI from DSN', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://publickey@org.ingest.sentry.io/12345';
      delete process.env.CSP_REPORT_URI;

      const uri = getCSPReportUri();
      expect(uri).toContain('sentry.io/api/12345/security');
      expect(uri).toContain('sentry_key=publickey');
    });

    it('should return undefined if no report URI available', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.CSP_REPORT_URI;
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;

      expect(getCSPReportUri()).toBeUndefined();
    });
  });

  describe('generateFullCSPHeader', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should include report-uri when available', () => {
      process.env.NODE_ENV = 'production';
      process.env.CSP_REPORT_URI = 'https://example.com/csp-report';

      const csp = generateFullCSPHeader('test-nonce');
      expect(csp).toContain('report-uri https://example.com/csp-report');
      expect(csp).toContain('report-to csp-endpoint');
    });

    it('should not include report-uri in development', () => {
      process.env.NODE_ENV = 'development';

      const csp = generateFullCSPHeader();
      expect(csp).not.toContain('report-uri');
      expect(csp).not.toContain('report-to');
    });
  });
});
