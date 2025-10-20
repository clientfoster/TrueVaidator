const { syntaxCheck, getMx, smtpProbe, validateEmail } = require('./validator');

describe('Email Validator', () => {
  describe('syntaxCheck', () => {
    it('should validate correct email syntax', async () => {
      const result = await syntaxCheck('test@example.com');
      expect(result).toBe(true);
    });

    it('should reject invalid email syntax', async () => {
      const result = await syntaxCheck('invalid-email');
      expect(result).toBe(false);
    });

    it('should reject empty email', async () => {
      const result = await syntaxCheck('');
      expect(result).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should throw error for missing email', async () => {
      await expect(validateEmail()).rejects.toThrow('email required');
    });

    it('should validate correct email', async () => {
      // Using a known good domain for testing
      const result = await validateEmail('support@google.com');
      expect(result.email).toBe('support@google.com');
      expect(result.syntax).toBe(true);
    }, 10000); // Increased timeout for SMTP connection

    it('should detect disposable email', async () => {
      const result = await validateEmail('test@mailinator.com');
      expect(result.disposable).toBe(true);
      expect(result.status).toBe('invalid');
    });

    it('should detect role account', async () => {
      const result = await validateEmail('admin@example.com');
      expect(result.role).toBe(true);
    });

    it('should skip SMTP when requested', async () => {
      const result = await validateEmail('test@example.com', { skip_smtp: true });
      expect(result.status).toBe('risky');
      expect(result.score).toBe(50);
    });
  });
});