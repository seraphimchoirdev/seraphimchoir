import { describe, expect, it } from '@jest/globals';

import { sanitizers } from '../input-sanitizer';

describe('Input Sanitizer', () => {
  describe('stripHtml', () => {
    it('should remove HTML tags', () => {
      expect(sanitizers.stripHtml('<p>Hello</p>')).toBe('Hello');
      expect(sanitizers.stripHtml('<script>alert("XSS")</script>')).toBe('alert("XSS")');
      expect(sanitizers.stripHtml('Hello <b>World</b>!')).toBe('Hello World!');
    });

    it('should remove HTML entities', () => {
      expect(sanitizers.stripHtml('&lt;script&gt;')).toBe('script');
      expect(sanitizers.stripHtml('Hello &amp; World')).toBe('Hello  World');
    });

    it('should trim whitespace', () => {
      expect(sanitizers.stripHtml('  Hello  ')).toBe('Hello');
    });

    it('should handle empty or invalid input', () => {
      expect(sanitizers.stripHtml('')).toBe('');
      expect(sanitizers.stripHtml('   ')).toBe('');
    });
  });

  describe('sanitizeSqlInput', () => {
    it('should remove SQL injection characters', () => {
      expect(sanitizers.sanitizeSqlInput("'; DROP TABLE users; --")).toBe(' DROP TABLE users ');
      expect(sanitizers.sanitizeSqlInput('SELECT * FROM users')).toBe('SELECT  FROM users');
      expect(sanitizers.sanitizeSqlInput("1' OR '1'='1")).toBe('1 OR 11');
    });

    it('should preserve safe characters', () => {
      expect(sanitizers.sanitizeSqlInput('Hello World')).toBe('Hello World');
      expect(sanitizers.sanitizeSqlInput('user@example.com')).toBe('user@example.com');
    });
  });

  describe('sanitizeEmail', () => {
    it('should normalize valid emails', () => {
      expect(sanitizers.sanitizeEmail('USER@EXAMPLE.COM')).toBe('user@example.com');
      expect(sanitizers.sanitizeEmail('  user@example.com  ')).toBe('user@example.com');
    });

    it('should return null for invalid emails', () => {
      expect(sanitizers.sanitizeEmail('not-an-email')).toBeNull();
      expect(sanitizers.sanitizeEmail('@example.com')).toBeNull();
      expect(sanitizers.sanitizeEmail('user@')).toBeNull();
      expect(sanitizers.sanitizeEmail('')).toBeNull();
    });

    it('should handle special characters in emails', () => {
      expect(sanitizers.sanitizeEmail('user+tag@example.com')).toBe('user+tag@example.com');
      expect(sanitizers.sanitizeEmail('user.name@example.co.kr')).toBe('user.name@example.co.kr');
    });
  });

  describe('sanitizeUrl', () => {
    it('should validate and normalize URLs', () => {
      expect(sanitizers.sanitizeUrl('https://example.com')).toBe('https://example.com/');
      expect(sanitizers.sanitizeUrl('http://example.com/path')).toBe('http://example.com/path');
      expect(sanitizers.sanitizeUrl('  https://example.com  ')).toBe('https://example.com/');
    });

    it('should reject invalid URLs', () => {
      expect(sanitizers.sanitizeUrl('javascript:alert(1)')).toBeNull();
      expect(sanitizers.sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
      expect(sanitizers.sanitizeUrl('not-a-url')).toBeNull();
      expect(sanitizers.sanitizeUrl('')).toBeNull();
    });

    it('should reject URLs with invalid protocols', () => {
      expect(sanitizers.sanitizeUrl('ftp://example.com')).toBeNull();
      expect(sanitizers.sanitizeUrl('file:///etc/passwd')).toBeNull();
    });
  });

  describe('sanitizePhoneNumber', () => {
    it('should format Korean phone numbers', () => {
      expect(sanitizers.sanitizePhoneNumber('01012345678')).toBe('010-1234-5678');
      expect(sanitizers.sanitizePhoneNumber('010-1234-5678')).toBe('010-1234-5678');
      expect(sanitizers.sanitizePhoneNumber('010 1234 5678')).toBe('010-1234-5678');
    });

    it('should handle Seoul landline numbers', () => {
      expect(sanitizers.sanitizePhoneNumber('0212345678')).toBe('02-1234-5678');
      expect(sanitizers.sanitizePhoneNumber('02-1234-5678')).toBe('02-1234-5678');
    });

    it('should handle other area codes', () => {
      expect(sanitizers.sanitizePhoneNumber('0311234567')).toBe('031-123-4567');
      expect(sanitizers.sanitizePhoneNumber('031-123-4567')).toBe('031-123-4567');
    });

    it('should return null for invalid phone numbers', () => {
      expect(sanitizers.sanitizePhoneNumber('123')).toBeNull();
      expect(sanitizers.sanitizePhoneNumber('not-a-phone')).toBeNull();
      expect(sanitizers.sanitizePhoneNumber('')).toBeNull();
    });
  });

  describe('sanitizeMemberName', () => {
    it('should clean and trim Korean names', () => {
      expect(sanitizers.sanitizeMemberName('  홍길동  ')).toBe('홍길동');
      expect(sanitizers.sanitizeMemberName('김 철수')).toBe('김철수');
    });

    it('should remove special characters', () => {
      expect(sanitizers.sanitizeMemberName('홍길동@#$')).toBe('홍길동');
      expect(sanitizers.sanitizeMemberName('김철수123')).toBe('김철수');
    });

    it('should handle English names', () => {
      expect(sanitizers.sanitizeMemberName('John Doe')).toBe('JohnDoe');
      expect(sanitizers.sanitizeMemberName('Mary-Jane')).toBe('MaryJane');
    });

    it('should limit length to 50 characters', () => {
      const longName = '가'.repeat(60);
      expect(sanitizers.sanitizeMemberName(longName).length).toBeLessThanOrEqual(50);
    });
  });

  describe('sanitizeTextNote', () => {
    it('should sanitize and limit text length', () => {
      const text = 'This is a <b>test</b> note';
      expect(sanitizers.sanitizeTextNote(text, 20)).toBe('This is a test note');
    });

    it('should truncate long text', () => {
      const longText = 'a'.repeat(100);
      const result = sanitizers.sanitizeTextNote(longText, 50);
      expect(result.length).toBeLessThanOrEqual(50);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should preserve line breaks', () => {
      const text = 'Line 1\nLine 2';
      expect(sanitizers.sanitizeTextNote(text, 100)).toBe('Line 1\nLine 2');
    });
  });
});
