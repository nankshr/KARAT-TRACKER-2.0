/**
 * PostgREST Client for Karat Tracker
 * API client that mirrors Supabase syntax for easier migration
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// JWT token storage
const TOKEN_KEY = 'karat_tracker_token';

interface User {
  id: string;
  username: string;
  role: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

// Get JWT token from localStorage
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// Save JWT token to localStorage
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

// Clear JWT token from localStorage
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// PostgREST Error class
export class PostgRESTError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'PostgRESTError';
  }
}

/**
 * Query Builder for PostgREST
 * Provides a fluent API similar to Supabase
 */
class QueryBuilder {
  private tableName: string;
  private token: string | null;
  private selectColumns = '*';
  private filters: string[] = [];
  private orderColumn?: string;
  private orderAscending = true;
  private limitValue?: number;
  private offsetValue?: number;
  private shouldReturnSingle = false;

  constructor(tableName: string, token: string | null) {
    this.tableName = tableName;
    this.token = token;
  }

  /**
   * Select columns
   * @param columns Columns to select (default: '*')
   */
  select(columns = '*'): this {
    this.selectColumns = columns;
    return this;
  }

  /**
   * Filter by equality
   */
  eq(column: string, value: any): this {
    this.filters.push(`${column}=eq.${value}`);
    return this;
  }

  /**
   * Filter by inequality
   */
  neq(column: string, value: any): this {
    this.filters.push(`${column}=neq.${value}`);
    return this;
  }

  /**
   * Filter by greater than
   */
  gt(column: string, value: any): this {
    this.filters.push(`${column}=gt.${value}`);
    return this;
  }

  /**
   * Filter by greater than or equal
   */
  gte(column: string, value: any): this {
    this.filters.push(`${column}=gte.${value}`);
    return this;
  }

  /**
   * Filter by less than
   */
  lt(column: string, value: any): this {
    this.filters.push(`${column}=lt.${value}`);
    return this;
  }

  /**
   * Filter by less than or equal
   */
  lte(column: string, value: any): this {
    this.filters.push(`${column}=lte.${value}`);
    return this;
  }

  /**
   * Filter by pattern matching (LIKE)
   */
  like(column: string, pattern: string): this {
    this.filters.push(`${column}=like.${pattern}`);
    return this;
  }

  /**
   * Filter by case-insensitive pattern matching (ILIKE)
   */
  ilike(column: string, pattern: string): this {
    this.filters.push(`${column}=ilike.${pattern}`);
    return this;
  }

  /**
   * Filter by IN clause
   */
  in(column: string, values: any[]): this {
    this.filters.push(`${column}=in.(${values.join(',')})`);
    return this;
  }

  /**
   * Filter by IS NULL
   */
  is(column: string, value: null): this {
    this.filters.push(`${column}=is.null`);
    return this;
  }

  /**
   * Order results
   */
  order(column: string, options?: { ascending?: boolean }): this {
    this.orderColumn = column;
    this.orderAscending = options?.ascending ?? true;
    return this;
  }

  /**
   * Limit results
   */
  limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  /**
   * Offset results
   */
  offset(count: number): this {
    this.offsetValue = count;
    return this;
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(): string {
    const params = new URLSearchParams();

    // Select columns
    params.append('select', this.selectColumns);

    // Add filters
    this.filters.forEach(filter => {
      const [column, condition] = filter.split('=');
      params.append(column, condition);
    });

    // Order
    if (this.orderColumn) {
      params.append('order', `${this.orderColumn}.${this.orderAscending ? 'asc' : 'desc'}`);
    }

    // Limit
    if (this.limitValue !== undefined) {
      params.append('limit', this.limitValue.toString());
    }

    // Offset
    if (this.offsetValue !== undefined) {
      params.append('offset', this.offsetValue.toString());
    }

    return `${API_URL}/${this.tableName}?${params.toString()}`;
  }

  /**
   * Execute GET request
   */
  async execute(): Promise<{ data: any; error: PostgRESTError | null }> {
    try {
      const url = this.buildUrl();
      const headers: HeadersInit = {
        'Accept': 'application/json'
      };

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        throw new PostgRESTError(
          errorText || 'Query failed',
          response.status
        );
      }

      let data = await response.json();

      // Handle single row return
      if (this.shouldReturnSingle) {
        if (data && Array.isArray(data) && data.length > 0) {
          return { data: data[0], error: null };
        }
        return {
          data: null,
          error: new PostgRESTError('No rows found', 404)
        };
      }

      return { data, error: null };
    } catch (error) {
      if (error instanceof PostgRESTError) {
        return { data: null, error };
      }
      return {
        data: null,
        error: new PostgRESTError(error instanceof Error ? error.message : 'Unknown error')
      };
    }
  }

  /**
   * Return single row (for compatibility with Supabase syntax)
   */
  single(): this {
    this.shouldReturnSingle = true;
    this.limit(1);
    return this;
  }
}

/**
 * Insert Builder for PostgREST
 */
class InsertBuilder {
  private tableName: string;
  private token: string | null;
  private data: any;
  private shouldSelect = false;
  private shouldReturnSingle = false;
  private upsertResolution?: 'merge-duplicates' | 'ignore-duplicates';
  private onConflictColumns?: string;

  constructor(tableName: string, token: string | null, data: any) {
    this.tableName = tableName;
    this.token = token;
    this.data = data;
  }

  /**
   * Select inserted row(s) after insert
   */
  select(): this {
    this.shouldSelect = true;
    return this;
  }

  /**
   * Return single row (for compatibility with Supabase syntax)
   */
  single(): this {
    this.shouldReturnSingle = true;
    return this;
  }

  /**
   * Enable UPSERT behavior (insert or update on conflict)
   * @param options - { onConflict?: string, ignoreDuplicates?: boolean }
   */
  upsert(options?: { onConflict?: string; ignoreDuplicates?: boolean }): this {
    this.upsertResolution = options?.ignoreDuplicates ? 'ignore-duplicates' : 'merge-duplicates';
    this.onConflictColumns = options?.onConflict;
    return this;
  }

  /**
   * Execute INSERT (or UPSERT if enabled)
   */
  async execute(): Promise<{ data: any; error: PostgRESTError | null }> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Build Prefer header
      const preferValues: string[] = [];

      if (this.shouldSelect) {
        preferValues.push('return=representation');
      }

      if (this.upsertResolution) {
        preferValues.push(`resolution=${this.upsertResolution}`);
      }

      if (preferValues.length > 0) {
        headers['Prefer'] = preferValues.join(',');
      }

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      // Build URL with on_conflict query parameter if specified
      let url = `${API_URL}/${this.tableName}`;
      if (this.onConflictColumns) {
        url += `?on_conflict=${this.onConflictColumns}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(this.data)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new PostgRESTError(
          errorText || 'Insert failed',
          response.status
        );
      }

      // If not selecting, return empty data
      if (!this.shouldSelect) {
        return { data: null, error: null };
      }

      const data = await response.json();

      // Handle single vs array return
      if (this.shouldReturnSingle) {
        return { data: Array.isArray(data) ? data[0] : data, error: null };
      }

      return { data, error: null };
    } catch (error) {
      if (error instanceof PostgRESTError) {
        return { data: null, error };
      }
      return {
        data: null,
        error: new PostgRESTError(error instanceof Error ? error.message : 'Unknown error')
      };
    }
  }
}

/**
 * Update Builder for PostgREST
 */
class UpdateBuilder {
  private tableName: string;
  private token: string | null;
  private data: any;
  private filters: string[] = [];
  private shouldSelect = false;
  private shouldReturnSingle = false;

  constructor(tableName: string, token: string | null, data: any) {
    this.tableName = tableName;
    this.token = token;
    this.data = data;
  }

  /**
   * Filter by equality
   */
  eq(column: string, value: any): this {
    this.filters.push(`${column}=eq.${value}`);
    return this;
  }

  /**
   * Select updated row(s) after update
   */
  select(): this {
    this.shouldSelect = true;
    return this;
  }

  /**
   * Return single row (for compatibility with Supabase syntax)
   */
  single(): this {
    this.shouldReturnSingle = true;
    return this;
  }

  /**
   * Execute UPDATE
   */
  async execute(): Promise<{ data: any; error: PostgRESTError | null }> {
    try {
      const params = new URLSearchParams();
      this.filters.forEach(filter => {
        const [column, condition] = filter.split('=');
        params.append(column, condition);
      });

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Only add Prefer header if we want to select the result
      if (this.shouldSelect) {
        headers['Prefer'] = 'return=representation';
      }

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(`${API_URL}/${this.tableName}?${params.toString()}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(this.data)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new PostgRESTError(
          errorText || 'Update failed',
          response.status
        );
      }

      // If not selecting, return empty data
      if (!this.shouldSelect) {
        return { data: null, error: null };
      }

      const data = await response.json();

      // Handle single vs array return
      if (this.shouldReturnSingle) {
        return { data: Array.isArray(data) ? data[0] : data, error: null };
      }

      return { data, error: null };
    } catch (error) {
      if (error instanceof PostgRESTError) {
        return { data: null, error };
      }
      return {
        data: null,
        error: new PostgRESTError(error instanceof Error ? error.message : 'Unknown error')
      };
    }
  }
}

/**
 * Delete Builder for PostgREST
 */
class DeleteBuilder {
  private tableName: string;
  private token: string | null;
  private filters: string[] = [];

  constructor(tableName: string, token: string | null) {
    this.tableName = tableName;
    this.token = token;
  }

  /**
   * Filter by equality
   */
  eq(column: string, value: any): this {
    this.filters.push(`${column}=eq.${value}`);
    return this;
  }

  /**
   * Execute DELETE
   */
  async execute(): Promise<{ error: PostgRESTError | null }> {
    try {
      const params = new URLSearchParams();
      this.filters.forEach(filter => {
        const [column, condition] = filter.split('=');
        params.append(column, condition);
      });

      const headers: HeadersInit = {};

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(`${API_URL}/${this.tableName}?${params.toString()}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new PostgRESTError(
          errorText || 'Delete failed',
          response.status
        );
      }

      return { error: null };
    } catch (error) {
      if (error instanceof PostgRESTError) {
        return { error };
      }
      return {
        error: new PostgRESTError(error instanceof Error ? error.message : 'Unknown error')
      };
    }
  }
}

/**
 * PostgREST Client
 * Main client class that provides Supabase-like API
 */
export class PostgRESTClient {
  private token: string | null;

  constructor() {
    this.token = getToken();
  }

  /**
   * Update token
   */
  setToken(token: string | null): void {
    this.token = token;
    if (token) {
      setToken(token);
    } else {
      clearToken();
    }
  }

  /**
   * Start a query on a table
   */
  from(tableName: string): {
    select: (columns?: string) => QueryBuilder;
    insert: (data: any | any[]) => InsertBuilder;
    update: (data: any) => UpdateBuilder;
    delete: () => DeleteBuilder;
  } {
    return {
      select: (columns = '*') => {
        const builder = new QueryBuilder(tableName, this.token);
        return builder.select(columns);
      },
      insert: (data) => {
        return new InsertBuilder(tableName, this.token, data);
      },
      update: (data) => {
        return new UpdateBuilder(tableName, this.token, data);
      },
      delete: () => {
        return new DeleteBuilder(tableName, this.token);
      }
    };
  }

  /**
   * Call a PostgreSQL function (RPC)
   */
  async rpc(functionName: string, params: any = {}): Promise<{ data: any; error: PostgRESTError | null }> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(`${API_URL}/rpc/${functionName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new PostgRESTError(
          errorText || `RPC call to ${functionName} failed`,
          response.status
        );
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      if (error instanceof PostgRESTError) {
        return { data: null, error };
      }
      return {
        data: null,
        error: new PostgRESTError(error instanceof Error ? error.message : 'Unknown error')
      };
    }
  }

  /**
   * Login (calls PostgreSQL login function)
   */
  async login(username: string, password: string): Promise<AuthResponse> {
    const { data, error } = await this.rpc('login', {
      username_input: username,
      password_input: password
    });

    if (error) {
      throw error;
    }

    // Handle array response from PostgreSQL function
    const loginData = Array.isArray(data) ? data[0] : data;

    if (!loginData || !loginData.token) {
      throw new PostgRESTError('Login failed: No token received from server');
    }

    // Store token
    this.setToken(loginData.token);

    // Return formatted response
    return {
      token: loginData.token,
      user: {
        id: loginData.user_id,
        username: loginData.username,
        role: loginData.role
      }
    };
  }

  /**
   * Logout (calls PostgreSQL logout function)
   */
  async logout(): Promise<void> {
    await this.rpc('logout');
    this.setToken(null);
  }
}

// Create and export singleton instance
const postgrest = new PostgRESTClient();
export default postgrest;
