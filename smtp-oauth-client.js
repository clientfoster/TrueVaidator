const net = require('net');
const tls = require('tls');

/**
 * SMTP Client with OAuth 2.0 (XOAUTH2/OAUTHBEARER) support
 * Extends basic SMTP functionality to support Yahoo OAuth authentication
 */
class SMTPOAuthClient {
  constructor(options = {}) {
    this.host = options.host;
    this.port = options.port || 587;
    this.secure = options.secure || false;
    this.timeout = options.timeout || 10000;
    this.socket = null;
    this.lastResponse = '';
  }

  /**
   * Connect to SMTP server
   * @returns {Promise<void>}
   */
  connect() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.socket) {
          this.socket.destroy();
        }
        reject(new Error('Connection timeout'));
      }, this.timeout);

      const onConnect = () => {
        clearTimeout(timeout);
        this.readResponse()
          .then(response => {
            if (response.code === 220) {
              resolve();
            } else {
              reject(new Error(`Unexpected greeting: ${response.message}`));
            }
          })
          .catch(reject);
      };

      if (this.secure) {
        this.socket = tls.connect({
          host: this.host,
          port: this.port,
          rejectUnauthorized: false
        }, onConnect);
      } else {
        this.socket = net.connect({
          host: this.host,
          port: this.port
        }, onConnect);
      }

      this.socket.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      this.socket.setEncoding('utf8');
    });
  }

  /**
   * Read SMTP server response
   * @returns {Promise<Object>}
   */
  readResponse() {
    return new Promise((resolve, reject) => {
      let data = '';
      
      const timeout = setTimeout(() => {
        this.socket.removeListener('data', onData);
        reject(new Error('Response timeout'));
      }, this.timeout);

      const onData = (chunk) => {
        data += chunk;
        
        // Check if response is complete (ends with \r\n)
        if (data.endsWith('\r\n')) {
          clearTimeout(timeout);
          this.socket.removeListener('data', onData);
          
          // Parse response
          const lines = data.trim().split('\r\n');
          const lastLine = lines[lines.length - 1];
          const match = lastLine.match(/^(\d{3})[\s-](.*)$/);
          
          if (match) {
            const code = parseInt(match[1]);
            const message = lines.join('\n');
            this.lastResponse = message;
            resolve({ code, message, lines });
          } else {
            reject(new Error(`Invalid SMTP response: ${data}`));
          }
        }
      };

      this.socket.on('data', onData);
    });
  }

  /**
   * Send SMTP command
   * @param {string} command - SMTP command to send
   * @returns {Promise<Object>}
   */
  sendCommand(command) {
    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.destroyed) {
        return reject(new Error('Socket not connected'));
      }

      this.socket.write(command + '\r\n', (err) => {
        if (err) {
          reject(err);
        } else {
          this.readResponse()
            .then(resolve)
            .catch(reject);
        }
      });
    });
  }

  /**
   * Send EHLO command and get server capabilities
   * @param {string} hostname - Client hostname
   * @returns {Promise<Array>}
   */
  async ehlo(hostname = 'validator.local') {
    const response = await this.sendCommand(`EHLO ${hostname}`);
    
    if (response.code !== 250) {
      throw new Error(`EHLO failed: ${response.message}`);
    }

    // Parse capabilities
    const capabilities = response.lines.slice(1).map(line => {
      return line.replace(/^250[-\s]/, '').trim();
    });

    return capabilities;
  }

  /**
   * Authenticate using XOAUTH2
   * @param {string} xoauth2String - Base64-encoded XOAUTH2 string
   * @returns {Promise<Object>}
   */
  async authXOAuth2(xoauth2String) {
    const response = await this.sendCommand(`AUTH XOAUTH2 ${xoauth2String}`);
    
    if (response.code === 235) {
      return { success: true, message: response.message };
    } else if (response.code === 334) {
      // Server sent a challenge, send empty response
      const challengeResponse = await this.sendCommand('');
      if (challengeResponse.code === 235) {
        return { success: true, message: challengeResponse.message };
      } else {
        throw new Error(`XOAUTH2 authentication failed: ${challengeResponse.message}`);
      }
    } else {
      throw new Error(`XOAUTH2 authentication failed: ${response.message}`);
    }
  }

  /**
   * Authenticate using OAUTHBEARER
   * @param {string} oauthBearerString - Base64-encoded OAUTHBEARER string
   * @returns {Promise<Object>}
   */
  async authOAuthBearer(oauthBearerString) {
    const response = await this.sendCommand(`AUTH OAUTHBEARER ${oauthBearerString}`);
    
    if (response.code === 235) {
      return { success: true, message: response.message };
    } else if (response.code === 334) {
      // Server sent a challenge, send empty response
      const challengeResponse = await this.sendCommand('');
      if (challengeResponse.code === 235) {
        return { success: true, message: challengeResponse.message };
      } else {
        throw new Error(`OAUTHBEARER authentication failed: ${challengeResponse.message}`);
      }
    } else {
      throw new Error(`OAUTHBEARER authentication failed: ${response.message}`);
    }
  }

  /**
   * Upgrade connection to TLS using STARTTLS
   * @returns {Promise<void>}
   */
  async startTLS() {
    const response = await this.sendCommand('STARTTLS');
    
    if (response.code !== 220) {
      throw new Error(`STARTTLS failed: ${response.message}`);
    }

    return new Promise((resolve, reject) => {
      const secureSocket = tls.connect({
        socket: this.socket,
        rejectUnauthorized: false
      }, () => {
        this.socket = secureSocket;
        this.socket.setEncoding('utf8');
        resolve();
      });

      secureSocket.on('error', reject);
    });
  }

  /**
   * Send MAIL FROM command
   * @param {string} from - Sender email address
   * @returns {Promise<Object>}
   */
  async mailFrom(from) {
    const response = await this.sendCommand(`MAIL FROM:<${from}>`);
    
    if (response.code !== 250) {
      throw new Error(`MAIL FROM failed: ${response.message}`);
    }

    return response;
  }

  /**
   * Send RCPT TO command
   * @param {string} to - Recipient email address
   * @returns {Promise<Object>}
   */
  async rcptTo(to) {
    const response = await this.sendCommand(`RCPT TO:<${to}>`);
    
    if (response.code !== 250) {
      throw new Error(`RCPT TO failed: ${response.message}`);
    }

    return response;
  }

  /**
   * Send QUIT command and close connection
   * @returns {Promise<void>}
   */
  async quit() {
    try {
      await this.sendCommand('QUIT');
    } catch (e) {
      // Ignore quit errors
    } finally {
      if (this.socket && !this.socket.destroyed) {
        this.socket.destroy();
      }
    }
  }

  /**
   * Close connection immediately
   */
  close() {
    if (this.socket && !this.socket.destroyed) {
      this.socket.destroy();
    }
  }

  /**
   * Check if XOAUTH2 is supported by server
   * @param {Array} capabilities - Server capabilities from EHLO
   * @returns {boolean}
   */
  static supportsXOAuth2(capabilities) {
    return capabilities.some(cap => 
      cap.toUpperCase().includes('AUTH') && cap.toUpperCase().includes('XOAUTH2')
    );
  }

  /**
   * Check if OAUTHBEARER is supported by server
   * @param {Array} capabilities - Server capabilities from EHLO
   * @returns {boolean}
   */
  static supportsOAuthBearer(capabilities) {
    return capabilities.some(cap => 
      cap.toUpperCase().includes('AUTH') && cap.toUpperCase().includes('OAUTHBEARER')
    );
  }

  /**
   * Check if STARTTLS is supported by server
   * @param {Array} capabilities - Server capabilities from EHLO
   * @returns {boolean}
   */
  static supportsStartTLS(capabilities) {
    return capabilities.some(cap => 
      cap.toUpperCase().includes('STARTTLS')
    );
  }
}

module.exports = SMTPOAuthClient;
