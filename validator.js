const dns = require('dns').promises;
const { SMTPClient } = require('smtp-client');
const SMTPOAuthClient = require('./smtp-oauth-client');

// Wrap the SMTP client to catch low-level errors
const originalSMTPClient = SMTPClient;

// Simple in-memory cache for MX records
const mxCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Simple in-memory cache for disposable domain checks
const disposableCache = new Map();

// Initialize Yahoo OAuth client

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
 * Get MX records for a domain with caching
 * @param {string} domain - Domain to lookup MX records for
 * @returns {Promise<Array>} - Array of MX exchange servers
 */
async function getMx(domain) {
  // Check cache first
  const cached = mxCache.get(domain);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }
  
  try {
    const mx = await dns.resolveMx(domain);
    mx.sort((a, b) => a.priority - b.priority);
    const result = mx.map(m => m.exchange);
    
    // Cache the result
    mxCache.set(domain, {
      value: result,
      timestamp: Date.now()
    });
    
    // Clean up old cache entries periodically
    if (mxCache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of mxCache.entries()) {
        if (now - value.timestamp >= CACHE_TTL) {
          mxCache.delete(key);
        }
      }
    }
    
    return result;
  } catch (e) {
    // Cache negative results too to avoid repeated failed lookups
    mxCache.set(domain, {
      value: [],
      timestamp: Date.now()
    });
    return [];
  }
}

/**
 * Check if domain is a Yahoo domain requiring OAuth
 * @param {string} domain - Domain to check
 * @returns {boolean} - True if domain is Yahoo
 */
function isYahooDomain(domain) {
  const domainLower = domain.toLowerCase();
  const yahooDomains = [
    'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de', 'yahoo.ca',
    'yahoo.com.au', 'yahoo.co.in', 'yahoo.co.jp', 'yahoo.es', 'yahoo.it',
    'ymail.com', 'rocketmail.com'
  ];
  
  return yahooDomains.some(yahooDomain => 
    domainLower === yahooDomain || domainLower.endsWith('.' + yahooDomain)
  );
}

/**
 * Probe SMTP server using OAuth authentication (for Yahoo)
 * @param {string} mxHost - Mail exchange server host
 * @param {string} from - Sender email address
 * @param {string} to - Recipient email address
 * @returns {Promise<Object>} - Result of SMTP probe
 */
/*async function smtpProbeOAuth(mxHost, from, to) {
  let client;
  
  try {
    // Get OAuth token for the email (if available)
    const accessToken = await yahooOAuth.getValidToken(to);
    
    if (!accessToken) {
      return {
        ok: false,
        error: 'OAuth token not available for this email',
        code: 'NO_OAUTH_TOKEN',
        requiresAuth: true
      };
    }
    
    client = new SMTPOAuthClient({
      host: mxHost,
      port: 587, // Yahoo uses port 587 for STARTTLS
      secure: false,
      timeout: 5000
    });
    
    // Connect to server
    await client.connect();
    
    // Send EHLO and get capabilities
    const capabilities = await client.ehlo('validator.local');
    
    // Upgrade to TLS if supported
    if (SMTPOAuthClient.supportsStartTLS(capabilities)) {
      await client.startTLS();
      // Send EHLO again after STARTTLS
      const newCapabilities = await client.ehlo('validator.local');
      capabilities.push(...newCapabilities);
    }
    
    // Generate OAuth authentication string
    const xoauth2String = yahooOAuth.generateXOAuth2String(to, accessToken, mxHost, 587);
    
    // Try XOAUTH2 first, then OAUTHBEARER
    if (SMTPOAuthClient.supportsXOAuth2(capabilities)) {
      await client.authXOAuth2(xoauth2String);
    } else if (SMTPOAuthClient.supportsOAuthBearer(capabilities)) {
      await client.authOAuthBearer(xoauth2String);
    } else {
      throw new Error('Server does not support OAuth authentication');
    }
    
    // Send MAIL FROM
    await client.mailFrom(from);
    
    // Send RCPT TO
    await client.rcptTo(to);
    
    // Quit
    await client.quit();
    
    return { ok: true, response: 'OAuth authentication successful' };
  } catch (e) {
    if (client) {
      client.close();
    }
    
    // Handle OAuth-specific errors
    if (e.message && e.message.includes('OAuth')) {
      return {
        ok: false,
        error: e.message,
        code: 'OAUTH_ERROR',
        requiresAuth: true
      };
    }
    
    // Handle network errors
    if (e.code === 'ECONNRESET' || e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT') {
      return {
        ok: false,
        error: `Connection error: ${e.message}`,
        code: e.code
      };
    }
    
    return {
      ok: false,
      error: e.message,
      code: e.code || 'SMTP_OAUTH_ERROR'
    };
  }
}*/

/**
 * Probe SMTP server to check if it accepts a recipient
 * @param {string} mxHost - Mail exchange server host
 * @param {string} from - Sender email address
 * @param {string} to - Recipient email address
 * @returns {Promise<Object>} - Result of SMTP probe
 */
async function smtpProbe(mxHost, from, to) {
  let client;
  
  try {
    client = new originalSMTPClient({
      host: mxHost,
      port: 25,
      timeout: 3000, // Reduced timeout for better performance
      secure: false
    });
    
    // Add comprehensive error handling at multiple levels
    let connectionError = null;
    const errorListener = (err) => {
      connectionError = err;
      console.log('SMTP Error caught:', err.message, err.code);
    };
    
    const closeListener = () => {
      // Handle clean closure
    };
    
    // Add error listeners at multiple levels with try-catch protection
    try {
      if (client.smtp) {
        // Main SMTP error listener
        client.smtp.on('error', errorListener);
        client.smtp.on('close', closeListener);
        
        // Underlying socket error listener
        if (client.smtp.socket) {
          client.smtp.socket.on('error', errorListener);
          client.smtp.socket.on('close', closeListener);
          
          // Add uncaughtException listener to the socket
          client.smtp.socket.on('uncaughtException', errorListener);
        }
        
        // Add listener for the SMTP channel if it exists
        if (client.smtp.channel) {
          client.smtp.channel.on('error', errorListener);
        }
      }
    } catch (listenerError) {
      console.log('Error setting up SMTP listeners:', listenerError.message);
    }
    
    // Temporarily increase max listeners to avoid warnings
    const socket = client.smtp;
    let originalMaxListeners;
    try {
      if (socket && typeof socket.getMaxListeners === 'function' && typeof socket.setMaxListeners === 'function') {
        originalMaxListeners = socket.getMaxListeners();
        if (originalMaxListeners < 20) {
          socket.setMaxListeners(20);
        }
      }
    } catch (maxListenerError) {
      console.log('Error managing max listeners:', maxListenerError.message);
    }
    
    // Wrap each SMTP operation in comprehensive error handling
    const performOperation = async (operation, timeoutMs) => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`${operation} timeout`));
        }, timeoutMs);
        
        client[operation]()
          .then(result => {
            clearTimeout(timeout);
            resolve(result);
          })
          .catch(err => {
            clearTimeout(timeout);
            reject(err);
          });
      });
    };
    
    const performOperationWithParams = async (operation, params, timeoutMs) => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`${operation} timeout`));
        }, timeoutMs);
        
        client[operation](params)
          .then(result => {
            clearTimeout(timeout);
            resolve(result);
          })
          .catch(err => {
            clearTimeout(timeout);
            reject(err);
          });
      });
    };
    
    // Perform connection with comprehensive error handling
    try {
      await performOperation('connect', 3000);
    } catch (err) {
      throw err;
    }
    
    // Check for connection errors
    if (connectionError) throw connectionError;
    
    // Perform greeting with comprehensive error handling
    try {
      await performOperationWithParams('greet', { hostname: 'validator.local' }, 2000);
    } catch (err) {
      throw err;
    }
    
    // Check for connection errors
    if (connectionError) throw connectionError;
    
    // Perform MAIL command with comprehensive error handling
    try {
      await performOperationWithParams('mail', { from }, 2000);
    } catch (err) {
      throw err;
    }
    
    // Check for connection errors
    if (connectionError) throw connectionError;
    
    // Perform RCPT command with comprehensive error handling
    let rcptRes;
    try {
      rcptRes = await performOperationWithParams('rcpt', { to }, 3000);
    } catch (err) {
      throw err;
    }
    
    // Check for connection errors
    if (connectionError) throw connectionError;
    
    // Perform quit with comprehensive error handling (ignore errors during quit)
    try {
      await performOperation('quit', 1000);
    } catch (err) {
      // Ignore quit errors
      console.log('Ignoring quit error:', err.message);
    }
    
    // Remove all error listeners with try-catch protection
    try {
      if (client.smtp) {
        client.smtp.removeListener('error', errorListener);
        client.smtp.removeListener('close', closeListener);
        
        if (client.smtp.socket) {
          client.smtp.socket.removeListener('error', errorListener);
          client.smtp.socket.removeListener('close', closeListener);
          client.smtp.socket.removeListener('uncaughtException', errorListener);
        }
        
        if (client.smtp.channel) {
          client.smtp.channel.removeListener('error', errorListener);
        }
      }
    } catch (removeError) {
      console.log('Error removing SMTP listeners:', removeError.message);
    }
    
    // Restore original max listeners
    try {
      if (socket && typeof socket.setMaxListeners === 'function' && originalMaxListeners !== undefined) {
        socket.setMaxListeners(originalMaxListeners);
      }
    } catch (restoreError) {
      console.log('Error restoring max listeners:', restoreError.message);
    }
    
    return { ok: true, response: rcptRes.message || '' };
  } catch (e) {
    // Remove all error listeners with try-catch protection
    try {
      if (client && client.smtp) {
        const errorListener = () => {};
        const closeListener = () => {};
        
        try {
          client.smtp.removeListener('error', errorListener);
        } catch (_) {}
        
        try {
          if (client.smtp.socket) {
            client.smtp.socket.removeListener('error', errorListener);
            client.smtp.socket.removeListener('close', closeListener);
            client.smtp.socket.removeListener('uncaughtException', errorListener);
          }
        } catch (_) {}
        
        try {
          if (client.smtp.channel) {
            client.smtp.channel.removeListener('error', errorListener);
          }
        } catch (_) {}
      }
    } catch (cleanupError) {
      console.log('Error during SMTP listener cleanup:', cleanupError.message);
    }
    
    // Restore original max listeners
    try {
      const socket = client ? client.smtp : null;
      if (socket && typeof socket.setMaxListeners === 'function' && originalMaxListeners !== undefined) {
        try {
          socket.setMaxListeners(originalMaxListeners);
        } catch (_) {}
      }
    } catch (restoreError) {
      console.log('Error during max listeners restore:', restoreError.message);
    }
    
    // Ensure client is properly closed even if errors occur
    try {
      if (client) {
        const quitPromise = new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(), 1000);
          client.quit()
            .then(() => {
              clearTimeout(timeout);
              resolve();
            })
            .catch(() => {
              clearTimeout(timeout);
              resolve();
            });
        });
        
        await quitPromise;
      }
    } catch(quittingError) {
      console.log('Error during SMTP client quit:', quittingError.message);
    }
    
    // Handle specific network errors
    if (e.code === 'ECONNRESET' || e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT' || e.code === 'EPIPE') {
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
 * Check if domain is from a known disposable email provider with caching
 * @param {string} domain - Domain to check
 * @returns {boolean} - True if domain is disposable
 */
function isDisposableDomain(domain) {
  // Check cache first
  if (disposableCache.has(domain)) {
    return disposableCache.get(domain);
  }
  
  // This is a simplified list - in production, use a comprehensive list
  const disposableDomains = [
    '10minutemail.com',
    'guerrillamail.com',
    'mailinator.com',
    'yopmail.com',
    'tempmail.org'
  ];
  
  const result = disposableDomains.includes(domain.toLowerCase());
  
  // Cache the result
  disposableCache.set(domain, result);
  
  // Clean up old cache entries periodically
  if (disposableCache.size > 10000) {
    const keys = Array.from(disposableCache.keys());
    // Remove oldest 1000 entries
    keys.slice(0, 1000).forEach(key => disposableCache.delete(key));
  }
  
  return result;
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
 * Check if domain requires SMTP skip due to strict anti-spam measures
 * @param {string} domain - Domain to check
 * @returns {boolean} - True if SMTP should be skipped for this domain
 */
function shouldSkipSMTP(domain) {
  const domainLower = domain.toLowerCase();
  
  // Domains that block or heavily restrict SMTP verification
  const strictDomains = [
    'yahoo.com',
    'yahoo.co.uk',
    'yahoo.fr',
    'yahoo.de',
    'yahoo.ca',
    'yahoo.com.au',
    'yahoo.co.in',
    'yahoo.co.jp',
    'ymail.com',
    'rocketmail.com',
    'aol.com',
    'aim.com'
  ];
  
  return strictDomains.some(strictDomain => 
    domainLower === strictDomain || domainLower.endsWith('.' + strictDomain)
  );
}

/**
 * Validate an email address through multiple checks with comprehensive error handling
 * @param {string} email - Email to validate
 * @param {Object} opts - Validation options
 * @returns {Promise<Object>} - Validation result
 */
async function validateEmail(email, opts = {}) {
  try {
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
    
    // Check if this is a Yahoo domain that supports OAuth
    const isYahoo = isYahooDomain(domain);
    
    // Check if SMTP should be skipped for this domain (Yahoo, AOL, etc.)
    const autoSkipSMTP = shouldSkipSMTP(domain);
    
    // Try OAuth authentication for Yahoo domains if configured
    /*if (isYahoo && yahooOAuth.isConfigured() && !opts.skip_smtp) {
      try {
        const oauthProbeResult = await smtpProbeOAuth(mx[0], 'validator@example.com', email);
        result.smtp = oauthProbeResult;
        
        if (oauthProbeResult.ok) {
          result.status = result.role ? 'risky' : 'valid';
          result.score = result.role ? 75 : 95;
          return result;
        } else if (oauthProbeResult.requiresAuth) {
          // OAuth token not available, fall back to reputation-based validation
          const domainReputation = getDomainReputation(domain);
          result.status = 'valid';
          result.score = result.role ? 70 : domainReputation;
          result.smtp = {
            ok: null,
            skipped: true,
            reason: 'OAuth authentication required but token not available, validated via MX and reputation'
          };
          return result;
        }
        // If OAuth failed for other reasons, fall through to skip logic
      } catch (oauthError) {
        console.error('OAuth SMTP probe error:', oauthError);
      }
    }*/
    
    // Skip SMTP if requested or auto-detected as strict domain
    if (opts.skip_smtp || autoSkipSMTP) {
      if (autoSkipSMTP) {
        // For strict domains, provide better validation based on MX records
        result.status = result.role ? 'risky' : 'valid';
        result.score = result.role ? 70 : 85;
        result.smtp = {
          ok: null,
          skipped: true,
          reason: 'Domain has strict anti-spam measures, validated via MX records'
        };
      } else {
        result.status = 'risky'; 
        result.score = 50;
      }
      return result;
    }
    
    // Try SMTP on top MX with additional error handling
    try {
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
    } catch (smtpError) {
      // Handle SMTP errors gracefully
      result.smtp = { 
        ok: false, 
        error: smtpError.message,
        code: smtpError.code || 'SMTP_ERROR'
      };
      result.status = 'invalid';
      result.score = 10;
    }
    
    return result;
  } catch (error) {
    // Catch any unexpected errors and return a safe result
    console.error('Unexpected error in validateEmail:', error);
    return {
      email,
      syntax: false,
      mx: [],
      smtp: { 
        ok: false, 
        error: error.message,
        code: error.code || 'VALIDATION_ERROR'
      },
      status: 'invalid',
      score: 0,
      disposable: false,
      role: false
    };
  }
}

// Wrap the validateEmail function in an additional safety layer
const originalValidateEmail = validateEmail;
async function safeValidateEmail(email, opts = {}) {
  try {
    return await originalValidateEmail(email, opts);
  } catch (error) {
    console.error('Error in safeValidateEmail wrapper:', error);
    // Return a safe fallback result
    return {
      email,
      syntax: false,
      mx: [],
      smtp: { 
        ok: false, 
        error: error.message || 'Validation failed',
        code: error.code || 'WRAPPER_ERROR'
      },
      status: 'invalid',
      score: 0,
      disposable: false,
      role: false
    };
  }
}

module.exports = {
  syntaxCheck,
  getMx,
  smtpProbe,
  // smtpProbeOAuth,
  validateEmail: safeValidateEmail, // Export the safe wrapper
  // yahooOAuth, // Export Yahoo OAuth instance for token management
  // isYahooDomain
};