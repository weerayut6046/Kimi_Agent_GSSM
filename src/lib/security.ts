// Lazy load heavy libraries only when needed
async function loadBcrypt() {
  const mod = await import('bcryptjs');
  return mod;
}



// Constants
const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Store login attempts in memory (in production, use Redis or database)
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

/**
 * Hash password using bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
  const bcrypt = await loadBcrypt();
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Verify password against hash
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const bcrypt = await loadBcrypt();
  return bcrypt.compare(password, hash);
};

/**
 * Sanitize input to prevent XSS attacks (synchronous, no heavy deps)
 */
export const sanitizeInput = (input: string): string => {
  return input.replace(/<[^>]*>/g, '');
};

/**
 * Validate password strength
 * - At least 8 characters
 * - Contains uppercase letter
 * - Contains lowercase letter
 * - Contains number
 * - Contains special character
 */
export const validatePasswordStrength = (password: string): { valid: boolean; message: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว' };
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return { valid: false, message: 'รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว (!@#$%^&*...)' };
  }

  return { valid: true, message: '' };
};

/**
 * Check if account is locked due to failed login attempts
 */
export const isAccountLocked = (email: string): { locked: boolean; remainingTime?: number } => {
  const attempts = loginAttempts.get(email);
  if (!attempts) return { locked: false };

  const now = Date.now();
  if (attempts.lockedUntil && now < attempts.lockedUntil) {
    const remainingTime = Math.ceil((attempts.lockedUntil - now) / 1000 / 60); // minutes
    return { locked: true, remainingTime };
  }

  // Reset if lockout period has passed
  if (attempts.lockedUntil && now >= attempts.lockedUntil) {
    loginAttempts.delete(email);
  }

  return { locked: false };
};

/**
 * Record failed login attempt
 */
export const recordFailedLogin = (email: string): void => {
  const attempts = loginAttempts.get(email);
  const now = Date.now();

  if (!attempts) {
    loginAttempts.set(email, { count: 1, lockedUntil: 0 });
  } else {
    const newCount = attempts.count + 1;
    if (newCount >= MAX_LOGIN_ATTEMPTS) {
      loginAttempts.set(email, { count: newCount, lockedUntil: now + LOCKOUT_DURATION });
    } else {
      loginAttempts.set(email, { count: newCount, lockedUntil: 0 });
    }
  }
};

/**
 * Clear login attempts on successful login
 */
export const clearLoginAttempts = (email: string): void => {
  loginAttempts.delete(email);
};

/**
 * Sanitize object values recursively
 */
export const sanitizeObject = <T extends Record<string, unknown>>(obj: T): T => {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized as T;
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generate secure random string
 */
export const generateSecureId = (): string => {
  const array = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Mask sensitive data for logging
 */
export const maskSensitiveData = (data: string, visibleChars: number = 4): string => {
  if (data.length <= visibleChars * 2) return '***';
  return data.slice(0, visibleChars) + '***' + data.slice(-visibleChars);
};
