import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { NextRequest, NextResponse } from 'next/server';

import { csrfProtection, generateCSRFToken, validateCSRFToken } from '../csrf-protection';

// Mock the modules
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    getAll: jest.fn(() => []),
  })),
  headers: jest.fn(() => ({
    get: jest.fn(),
  })),
}));

jest.mock('../csp-nonce', () => ({
  generateNonce: jest.fn(() => 'test-nonce-123'),
}));

describe('CSRF Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateCSRFToken', () => {
    it('should generate a valid CSRF token', async () => {
      const token = await generateCSRFToken();
      expect(token).toBe('test-nonce-123');
    });
  });

  describe('validateCSRFToken', () => {
    it('should allow GET requests without token', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'GET',
      });

      const result = await validateCSRFToken(request);
      expect(result).toBe(true);
    });

    it('should allow HEAD requests without token', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'HEAD',
      });

      const result = await validateCSRFToken(request);
      expect(result).toBe(true);
    });

    it('should allow OPTIONS requests without token', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'OPTIONS',
      });

      const result = await validateCSRFToken(request);
      expect(result).toBe(true);
    });

    it('should validate POST request with matching token in header', async () => {
      const { cookies, headers } = require('next/headers');

      cookies.mockResolvedValue({
        get: jest.fn(() => ({ value: 'valid-token' })),
      });

      headers.mockResolvedValue({
        get: jest.fn(() => 'valid-token'),
      });

      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      });

      const result = await validateCSRFToken(request);
      expect(result).toBe(true);
    });

    it('should reject POST request without token', async () => {
      const { cookies, headers } = require('next/headers');

      cookies.mockResolvedValue({
        get: jest.fn(() => null),
      });

      headers.mockResolvedValue({
        get: jest.fn(() => null),
      });

      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      });

      const result = await validateCSRFToken(request);
      expect(result).toBe(false);
    });

    it('should reject POST request with mismatched tokens', async () => {
      const { cookies, headers } = require('next/headers');

      cookies.mockResolvedValue({
        get: jest.fn(() => ({ value: 'cookie-token' })),
      });

      headers.mockResolvedValue({
        get: jest.fn(() => 'different-token'),
      });

      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      });

      const result = await validateCSRFToken(request);
      expect(result).toBe(false);
    });

    it('should validate PUT request with token', async () => {
      const { cookies, headers } = require('next/headers');

      cookies.mockResolvedValue({
        get: jest.fn(() => ({ value: 'valid-token' })),
      });

      headers.mockResolvedValue({
        get: jest.fn(() => 'valid-token'),
      });

      const request = new NextRequest('http://localhost/api/test', {
        method: 'PUT',
      });

      const result = await validateCSRFToken(request);
      expect(result).toBe(true);
    });

    it('should validate DELETE request with token', async () => {
      const { cookies, headers } = require('next/headers');

      cookies.mockResolvedValue({
        get: jest.fn(() => ({ value: 'valid-token' })),
      });

      headers.mockResolvedValue({
        get: jest.fn(() => 'valid-token'),
      });

      const request = new NextRequest('http://localhost/api/test', {
        method: 'DELETE',
      });

      const result = await validateCSRFToken(request);
      expect(result).toBe(true);
    });
  });

  describe('csrfProtection middleware', () => {
    it('should pass through valid requests', async () => {
      const { cookies, headers } = require('next/headers');

      cookies.mockResolvedValue({
        get: jest.fn(() => ({ value: 'valid-token' })),
        set: jest.fn(),
      });

      headers.mockResolvedValue({
        get: jest.fn(() => 'valid-token'),
      });

      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      });

      const handler = jest.fn(async () => NextResponse.json({ success: true }, { status: 200 }));

      const response = await csrfProtection(request, handler);

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should reject invalid CSRF token', async () => {
      const { cookies, headers } = require('next/headers');

      cookies.mockResolvedValue({
        get: jest.fn(() => ({ value: 'cookie-token' })),
      });

      headers.mockResolvedValue({
        get: jest.fn(() => 'wrong-token'),
      });

      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      });

      const handler = jest.fn(async () => NextResponse.json({ success: true }));

      const response = await csrfProtection(request, handler);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);

      const body = await response.json();
      expect(body.error).toBe('CSRF token validation failed');
    });

    it('should rotate token on successful POST', async () => {
      const { cookies, headers } = require('next/headers');
      const { generateNonce } = require('../csp-nonce');

      const cookieSet = jest.fn();
      cookies.mockResolvedValue({
        get: jest.fn(() => ({ value: 'valid-token' })),
        set: cookieSet,
      });

      headers.mockResolvedValue({
        get: jest.fn(() => 'valid-token'),
      });

      generateNonce.mockReturnValue('new-token-456');

      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      });

      const handler = jest.fn(async () => NextResponse.json({ success: true }, { status: 200 }));

      const response = await csrfProtection(request, handler);

      expect(response.status).toBe(200);
      expect(response.headers.get('x-csrf-token')).toBe('new-token-456');
    });
  });
});
