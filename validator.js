const dns = require('dns').promises;
const { SMTPClient } = require('smtp-client');

/**
 * Perform basic syntax check on email address
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if email has valid syntax
 */
async function syntaxCheck(email) {
  const re = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  return re.test(email);
}

/**
 * Get MX records for a domain
 * @param {string} domain - Domain to lookup MX records for
 * @returns {Promise<Array>} - Array of MX exchange servers
 */
async function getMx(domain) {
  try {
    const mx = await dns.resolveMx(domain);
    mx.sort((a, b) => a.priority - b.priority);
    return mx.map(m => m.exchange);
  } catch (e) {
    return [];
  }
}

/**
 * Probe SMTP server to check if it accepts a recipient
 * @param {string} mxHost - Mail exchange server host
 * @param {string} from - Sender email address
 * @param {string} to - Recipient email address
 * @returns {Promise<Object>} - Result of SMTP probe
 */
async function smtpProbe(mxHost, from, to) {
  const client = new SMTPClient({
    host: mxHost,
    port: 25,
    timeout: 10000, // Increase timeout to 10 seconds
    secure: false // Explicitly set secure option
  });
  
  try {
    // Add connection timeout handling
    await Promise.race([
      client.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SMTP connection timeout')), 10000)
      )
    ]);
    
    await Promise.race([
      client.greet({ hostname: 'validator.local' }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SMTP greeting timeout')), 5000)
      )
    ]);
    
    await Promise.race([
      client.mail({ from }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SMTP MAIL timeout')), 5000)
      )
    ]);
    
    const rcptRes = await Promise.race([
      client.rcpt({ to }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SMTP RCPT timeout')), 5000)
      )
    ]);
    
    await Promise.race([
      client.quit(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SMTP quit timeout')), 5000)
      )
    ]);
    
    return { ok: true, response: rcptRes.message || '' };
  } catch (e) {
    // Ensure client is properly closed even if errors occur
    try { 
      await Promise.race([
        client.quit(),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
    } catch(_) {
      // Ignore errors during quit as connection may already be closed
    }
    
    // Handle specific network errors
    if (e.code === 'ECONNRESET' || e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT') {
      return { 
        ok: false, 
        error: `Connection error: ${e.message}`,
        code: e.code
      };
    }
    
    // Handle timeout errors
    if (e.message && e.message.includes('timeout')) {
      return { 
        ok: false, 
        error: e.message,
        code: 'TIMEOUT'
      };
    }
    
    // Handle general errors
    return { 
      ok: false, 
      error: e.message,
      code: e.code || 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Check if domain is from a known disposable email provider
 * @param {string} domain - Domain to check
 * @returns {boolean} - True if domain is disposable
 */
function isDisposableDomain(domain) {
  // This is a simplified list - in production, use a comprehensive list
  const disposableDomains = [
    '10minutemail.com',
    'guerrillamail.com',
    'mailinator.com',
    'yopmail.com',
    'tempmail.org'
  ];
  
  return disposableDomains.includes(domain.toLowerCase());
}

/**
 * Check if email is a role account (e.g., admin@, sales@)
 * @param {string} localPart - Part before @ in email
 * @returns {boolean} - True if email is a role account
 */
function isRoleAccount(localPart) {
  const roleAccounts = [
    'admin', 'administrator', 'sales', 'info', 'support', 
    'webmaster', 'postmaster', 'contact', 'help', 'noreply'
  ];
  
  return roleAccounts.includes(localPart.toLowerCase());
}

/**
 * Validate an email address through multiple checks
 * @param {string} email - Email to validate
 * @param {Object} opts - Validation options
 * @returns {Promise<Object>} - Validation result
 */
async function validateEmail(email, opts = {}) {
  const result = { 
    email, 
    syntax: false, 
    mx: [], 
    smtp: null, 
    status: 'unknown', 
    score: 0,
    disposable: false,
    role: false
  };
  
  if (!email) throw new Error('email required');
  
  // Syntax check
  result.syntax = await syntaxCheck(email);
  if (!result.syntax) { 
    result.status = 'invalid'; 
    return result; 
  }
  
  // Split email into local and domain parts
  const [localPart, domain] = email.split('@');
  
  // Check for disposable domain
  result.disposable = isDisposableDomain(domain);
  if (result.disposable) {
    result.status = 'invalid';
    result.score = 0;
    return result;
  }
  
  // Check for role account
  result.role = isRoleAccount(localPart);
  
  // MX lookup
  const mx = await getMx(domain);
  result.mx = mx;
  if (!mx.length) { 
    result.status = 'invalid'; 
    return result; 
  }
  
  // Skip SMTP if requested
  if (opts.skip_smtp) {
    result.status = 'risky'; 
    result.score = 50; 
    return result;
  }
  
  // Try SMTP on top MX
  const probeResult = await smtpProbe(mx[0], 'validator@example.com', email);
  result.smtp = probeResult;
  
  // Calculate final status and score
  if (probeResult.ok) {
    result.status = result.role ? 'risky' : 'valid';
    result.score = result.role ? 75 : 95;
  } else {
    result.status = 'invalid';
    result.score = 10;
  }
  
  return result;
}

module.exports = {
  syntaxCheck,
  getMx,
  smtpProbe,
  validateEmail
};