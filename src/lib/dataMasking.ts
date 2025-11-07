/**
 * Data Masking Utility for Privacy Protection
 *
 * This utility ensures that sensitive customer information is masked
 * before being sent to external LLM services for privacy protection.
 */

interface MaskingOptions {
  maskCustomerNames: boolean;
  maskPhoneNumbers: boolean;
  maskEmails: boolean;
  preserveDataStructure: boolean;
}

export class DataMaskingService {
  private static readonly DEFAULT_OPTIONS: MaskingOptions = {
    maskCustomerNames: true,
    maskPhoneNumbers: true,
    maskEmails: true,
    preserveDataStructure: true,
  };

  // Sensitive field names that should be masked
  private static readonly SENSITIVE_FIELDS = {
    customerNames: ['customer_name', 'name', 'customer', 'client_name'],
    phoneNumbers: ['customer_phone', 'phone', 'mobile', 'contact_number'],
    emails: ['email', 'customer_email', 'contact_email'],
  };

  /**
   * Masks sensitive data in query results before sending to LLM
   */
  static maskQueryResults(results: any[], options: Partial<MaskingOptions> = {}): any[] {
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };

    if (!results || results.length === 0) {
      return results;
    }

    return results.map(row => this.maskRowData(row, finalOptions));
  }

  /**
   * Masks sensitive data in sample data for context
   */
  static maskSampleData(sampleData: any[], options: Partial<MaskingOptions> = {}): any[] {
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };

    if (!sampleData || sampleData.length === 0) {
      return sampleData;
    }

    // Only mask the first few samples to preserve data structure while protecting privacy
    return sampleData.slice(0, 3).map(row => this.maskRowData(row, finalOptions));
  }

  /**
   * Masks sensitive fields in a single data row
   */
  private static maskRowData(row: any, options: MaskingOptions): any {
    if (!row || typeof row !== 'object') {
      return row;
    }

    const maskedRow = { ...row };

    // Mask customer names
    if (options.maskCustomerNames) {
      this.SENSITIVE_FIELDS.customerNames.forEach(field => {
        if (maskedRow[field]) {
          maskedRow[field] = this.maskCustomerName(maskedRow[field]);
        }
      });
    }

    // Mask phone numbers
    if (options.maskPhoneNumbers) {
      this.SENSITIVE_FIELDS.phoneNumbers.forEach(field => {
        if (maskedRow[field]) {
          maskedRow[field] = this.maskPhoneNumber(maskedRow[field]);
        }
      });
    }

    // Mask email addresses
    if (options.maskEmails) {
      this.SENSITIVE_FIELDS.emails.forEach(field => {
        if (maskedRow[field]) {
          maskedRow[field] = this.maskEmail(maskedRow[field]);
        }
      });
    }

    return maskedRow;
  }

  /**
   * Masks customer names while preserving length and structure
   */
  private static maskCustomerName(name: string): string {
    if (!name || typeof name !== 'string') {
      return name;
    }

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      return name;
    }

    // For single names
    if (!trimmedName.includes(' ')) {
      if (trimmedName.length <= 2) {
        return 'C*';
      } else if (trimmedName.length <= 4) {
        return `${trimmedName[0]}***`;
      } else {
        return `${trimmedName[0]}${'*'.repeat(trimmedName.length - 2)}${trimmedName[trimmedName.length - 1]}`;
      }
    }

    // For multiple names (first name + last name)
    const nameParts = trimmedName.split(' ');
    const maskedParts = nameParts.map((part, index) => {
      if (part.length <= 1) {
        return '*';
      } else if (part.length <= 3) {
        return `${part[0]}**`;
      } else {
        return `${part[0]}${'*'.repeat(part.length - 2)}${part[part.length - 1]}`;
      }
    });

    return maskedParts.join(' ');
  }

  /**
   * Masks phone numbers while preserving format structure
   */
  private static maskPhoneNumber(phone: string): string {
    if (!phone || typeof phone !== 'string') {
      return phone;
    }

    const cleanPhone = phone.trim();
    if (cleanPhone.length === 0) {
      return phone;
    }

    // Extract just the digits
    const digits = cleanPhone.replace(/\D/g, '');

    if (digits.length === 0) {
      return phone;
    }

    // Preserve format but mask middle digits
    if (digits.length === 10) {
      // 9876543210 -> 98****3210
      return cleanPhone.replace(/\d/g, (digit, index) => {
        const digitIndex = cleanPhone.substring(0, index).replace(/\D/g, '').length;
        if (digitIndex < 2 || digitIndex >= digits.length - 4) {
          return digit;
        }
        return '*';
      });
    } else if (digits.length === 12 && digits.startsWith('91')) {
      // +919876543210 -> +919****3210
      return cleanPhone.replace(/\d/g, (digit, index) => {
        const digitIndex = cleanPhone.substring(0, index).replace(/\D/g, '').length;
        if (digitIndex < 4 || digitIndex >= digits.length - 4) {
          return digit;
        }
        return '*';
      });
    } else {
      // Generic masking for other formats
      const visibleDigits = Math.min(4, Math.floor(digits.length / 2));
      return cleanPhone.replace(/\d/g, (digit, index) => {
        const digitIndex = cleanPhone.substring(0, index).replace(/\D/g, '').length;
        if (digitIndex < 2 || digitIndex >= digits.length - (visibleDigits - 2)) {
          return digit;
        }
        return '*';
      });
    }
  }

  /**
   * Masks email addresses while preserving domain
   */
  private static maskEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      return email;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes('@')) {
      return email;
    }

    const [localPart, domain] = trimmedEmail.split('@');

    if (localPart.length <= 1) {
      return `*@${domain}`;
    } else if (localPart.length <= 3) {
      return `${localPart[0]}**@${domain}`;
    } else {
      const maskedLocal = `${localPart[0]}${'*'.repeat(localPart.length - 2)}${localPart[localPart.length - 1]}`;
      return `${maskedLocal}@${domain}`;
    }
  }

  /**
   * Checks if a field name is considered sensitive
   */
  static isSensitiveField(fieldName: string): boolean {
    const lowerFieldName = fieldName.toLowerCase();

    return Object.values(this.SENSITIVE_FIELDS)
      .flat()
      .some(sensitiveField => lowerFieldName.includes(sensitiveField.toLowerCase()));
  }

  /**
   * Gets summary statistics without exposing sensitive data
   */
  static getSafeDataSummary(results: any[]): {
    recordCount: number;
    columns: string[];
    sensitiveFieldsDetected: string[];
    hasSensitiveData: boolean;
  } {
    if (!results || results.length === 0) {
      return {
        recordCount: 0,
        columns: [],
        sensitiveFieldsDetected: [],
        hasSensitiveData: false
      };
    }

    const columns = Object.keys(results[0] || {});
    const sensitiveFieldsDetected = columns.filter(col => this.isSensitiveField(col));

    return {
      recordCount: results.length,
      columns,
      sensitiveFieldsDetected,
      hasSensitiveData: sensitiveFieldsDetected.length > 0
    };
  }

  /**
   * Creates a privacy-safe description of the data for LLM context
   */
  static createSafeDataDescription(results: any[]): string {
    const summary = this.getSafeDataSummary(results);

    if (summary.recordCount === 0) {
      return "No data found.";
    }

    let description = `Found ${summary.recordCount} records with columns: ${summary.columns.join(', ')}.`;

    if (summary.hasSensitiveData) {
      description += ` Note: Customer personal information has been masked for privacy protection.`;
    }

    // Add sample of non-sensitive data for context
    const maskedSample = this.maskQueryResults(results.slice(0, 2));
    const nonSensitiveColumns = summary.columns.filter(col => !this.isSensitiveField(col));

    if (nonSensitiveColumns.length > 0 && maskedSample.length > 0) {
      const sampleData = maskedSample.map(row => {
        const safeSample: any = {};
        nonSensitiveColumns.slice(0, 5).forEach(col => { // Limit to 5 columns for brevity
          safeSample[col] = row[col];
        });
        return safeSample;
      });

      description += ` Sample data structure: ${JSON.stringify(sampleData[0], null, 0)}.`;
    }

    return description;
  }
}

export default DataMaskingService;