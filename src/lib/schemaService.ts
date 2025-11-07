import postgrest from '@/lib/postgrestClient';

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
}

export interface TableSchema {
  tableName: string;
  columns: ColumnInfo[];
  primaryKeys: string[];
  foreignKeys: Array<{
    column: string;
    referencedTable: string;
    referencedColumn: string;
  }>;
  indexes: Array<{
    name: string;
    columns: string[];
    unique: boolean;
  }>;
}

export class SchemaService {
  private static schemaCache: Map<string, TableSchema> = new Map();
  private static cacheTimestamp: Map<string, number> = new Map();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static async getTableSchema(tableName: string): Promise<TableSchema> {
    // Check cache first
    const cached = this.schemaCache.get(tableName);
    const cacheTime = this.cacheTimestamp.get(tableName);

    if (cached && cacheTime && Date.now() - cacheTime < this.CACHE_DURATION) {
      return cached;
    }

    try {
      const schema = await this.fetchTableSchema(tableName);

      // Cache the result
      this.schemaCache.set(tableName, schema);
      this.cacheTimestamp.set(tableName, Date.now());

      return schema;
    } catch (error) {
      console.error(`Error fetching schema for table ${tableName}:`, error);

      // Return fallback schema if fetch fails
      return this.getFallbackSchema(tableName);
    }
  }

  private static async fetchTableSchema(tableName: string): Promise<TableSchema> {
    try {
      // Try to get column information using RPC
      const { data: columns, error: columnsError } = await postgrest
        .rpc('get_table_schema', { table_name: tableName });

      if (!columnsError && columns) {
        return this.buildSchemaFromColumns(tableName, columns);
      }

      console.warn(`RPC get_table_schema failed for ${tableName}, using fallback schema`);
    } catch (error) {
      console.warn(`RPC call failed for ${tableName}:`, error);
    }

    // Use fallback schema if RPC fails
    return this.getFallbackSchema(tableName);
  }

  private static buildSchemaFromColumns(tableName: string, columns: any[]): TableSchema {
    const columnInfo: ColumnInfo[] = columns.map(col => ({
      column_name: col.column_name,
      data_type: col.data_type,
      is_nullable: col.is_nullable,
      column_default: col.column_default,
      character_maximum_length: col.character_maximum_length,
      numeric_precision: col.numeric_precision,
      numeric_scale: col.numeric_scale,
    }));

    // Extract primary keys (look for columns with 'id' or typical primary key patterns)
    const primaryKeys = columns
      .filter(col =>
        col.column_name === 'id' ||
        col.column_default?.includes('nextval') ||
        col.data_type === 'uuid'
      )
      .map(col => col.column_name);

    // Basic foreign key detection (columns ending with _id or _uuid)
    const foreignKeys = columns
      .filter(col =>
        (col.column_name.endsWith('_id') || col.column_name.endsWith('_uuid')) &&
        col.column_name !== 'id'
      )
      .map(col => ({
        column: col.column_name,
        referencedTable: col.column_name.replace(/_id$|_uuid$/, ''),
        referencedColumn: 'id'
      }));

    return {
      tableName,
      columns: columnInfo,
      primaryKeys,
      foreignKeys,
      indexes: [] // Would need additional queries to get indexes
    };
  }

  private static getFallbackSchema(tableName: string): TableSchema {
    // Predefined schemas for known tables
    const knownSchemas: Record<string, TableSchema> = {
      sales_log: {
        tableName: 'sales_log',
        columns: [
          { column_name: 'id', data_type: 'bigint', is_nullable: 'NO', column_default: 'nextval', character_maximum_length: null, numeric_precision: 64, numeric_scale: 0 },
          { column_name: 'inserted_by', data_type: 'text', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: null, numeric_scale: null },
          { column_name: 'asof_date', data_type: 'date', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: null, numeric_scale: null },
          { column_name: 'material', data_type: 'text', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: null, numeric_scale: null },
          { column_name: 'type', data_type: 'text', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: null, numeric_scale: null },
          { column_name: 'item_name', data_type: 'text', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: null, numeric_scale: null },
          { column_name: 'tag_no', data_type: 'text', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: null, numeric_scale: null },
          { column_name: 'customer_name', data_type: 'text', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: null, numeric_scale: null },
          { column_name: 'customer_phone', data_type: 'text', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: null, numeric_scale: null },
          { column_name: 'purchase_weight_grams', data_type: 'numeric', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: 10, numeric_scale: 3 },
          { column_name: 'purchase_purity', data_type: 'numeric', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: 5, numeric_scale: 2 },
          { column_name: 'purchase_cost', data_type: 'numeric', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: 12, numeric_scale: 2 },
          { column_name: 'selling_purity', data_type: 'numeric', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: 5, numeric_scale: 2 },
          { column_name: 'wastage', data_type: 'numeric', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: 5, numeric_scale: 2 },
          { column_name: 'selling_cost', data_type: 'numeric', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: 12, numeric_scale: 2 },
          { column_name: 'old_weight_grams', data_type: 'numeric', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: 10, numeric_scale: 3 },
          { column_name: 'old_purchase_purity', data_type: 'numeric', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: 5, numeric_scale: 2 },
          { column_name: 'o2_gram', data_type: 'numeric', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: 10, numeric_scale: 3 },
          { column_name: 'old_sales_purity', data_type: 'numeric', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: 5, numeric_scale: 2 },
          { column_name: 'old_material_profit', data_type: 'numeric', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: 12, numeric_scale: 2 },
          { column_name: 'profit', data_type: 'numeric', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: 12, numeric_scale: 2 },
          { column_name: 'created_at', data_type: 'timestamp with time zone', is_nullable: 'YES', column_default: 'now()', character_maximum_length: null, numeric_precision: null, numeric_scale: null },
        ],
        primaryKeys: ['id'],
        foreignKeys: [],
        indexes: []
      },
      expense_log: {
        tableName: 'expense_log',
        columns: [
          { column_name: 'id', data_type: 'bigint', is_nullable: 'NO', column_default: 'nextval', character_maximum_length: null, numeric_precision: 64, numeric_scale: 0 },
          { column_name: 'asof_date', data_type: 'date', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: null, numeric_scale: null },
          { column_name: 'expense_type', data_type: 'text', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: null, numeric_scale: null },
          { column_name: 'item_name', data_type: 'text', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: null, numeric_scale: null },
          { column_name: 'cost', data_type: 'numeric', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: 12, numeric_scale: 2 },
          { column_name: 'is_credit', data_type: 'boolean', is_nullable: 'YES', column_default: 'false', character_maximum_length: null, numeric_precision: null, numeric_scale: null },
          { column_name: 'created_at', data_type: 'timestamp with time zone', is_nullable: 'YES', column_default: 'now()', character_maximum_length: null, numeric_precision: null, numeric_scale: null },
        ],
        primaryKeys: ['id'],
        foreignKeys: [],
        indexes: []
      },
      daily_rates: {
        tableName: 'daily_rates',
        columns: [
          { column_name: 'id', data_type: 'bigint', is_nullable: 'NO', column_default: 'nextval', character_maximum_length: null, numeric_precision: 64, numeric_scale: 0 },
          { column_name: 'asof_date', data_type: 'date', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: null, numeric_scale: null },
          { column_name: 'inserted_by', data_type: 'text', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: null, numeric_scale: null },
          { column_name: 'material', data_type: 'text', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: null, numeric_scale: null },
          { column_name: 'karat', data_type: 'text', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: null, numeric_scale: null },
          { column_name: 'new_price_per_gram', data_type: 'numeric', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: 12, numeric_scale: 2 },
          { column_name: 'old_price_per_gram', data_type: 'numeric', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: 12, numeric_scale: 2 },
          { column_name: 'created_at', data_type: 'timestamp with time zone', is_nullable: 'YES', column_default: 'now()', character_maximum_length: null, numeric_precision: null, numeric_scale: null },
        ],
        primaryKeys: ['id'],
        foreignKeys: [],
        indexes: []
      },
      users: {
        tableName: 'users',
        columns: [
          { column_name: 'id', data_type: 'bigint', is_nullable: 'NO', column_default: 'nextval', character_maximum_length: null, numeric_precision: 64, numeric_scale: 0 },
          { column_name: 'username', data_type: 'text', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: null, numeric_scale: null },
          { column_name: 'password', data_type: 'text', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: null, numeric_scale: null },
          { column_name: 'role', data_type: 'text', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: null, numeric_scale: null },
          { column_name: 'created_at', data_type: 'timestamp with time zone', is_nullable: 'YES', column_default: 'now()', character_maximum_length: null, numeric_precision: null, numeric_scale: null },
        ],
        primaryKeys: ['id'],
        foreignKeys: [],
        indexes: []
      },
      activity_log: {
        tableName: 'activity_log',
        columns: [
          { column_name: 'id', data_type: 'bigint', is_nullable: 'NO', column_default: 'nextval', character_maximum_length: null, numeric_precision: 64, numeric_scale: 0 },
          { column_name: 'user_id', data_type: 'text', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: null, numeric_scale: null },
          { column_name: 'action', data_type: 'text', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: null, numeric_scale: null },
          { column_name: 'details', data_type: 'text', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: null, numeric_scale: null },
          { column_name: 'timestamp', data_type: 'timestamp with time zone', is_nullable: 'YES', column_default: 'now()', character_maximum_length: null, numeric_precision: null, numeric_scale: null },
          { column_name: 'ip_address', data_type: 'text', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: null, numeric_scale: null },
          { column_name: 'user_agent', data_type: 'text', is_nullable: 'YES', column_default: null, character_maximum_length: null, numeric_precision: null, numeric_scale: null },
        ],
        primaryKeys: ['id'],
        foreignKeys: [{ column: 'user_id', referencedTable: 'users', referencedColumn: 'id' }],
        indexes: []
      }
    };

    return knownSchemas[tableName] || {
      tableName,
      columns: [],
      primaryKeys: [],
      foreignKeys: [],
      indexes: []
    };
  }

  static formatSchemaForAI(schema: TableSchema): string {
    const { tableName, columns, primaryKeys, foreignKeys } = schema;

    let output = `\nTable: ${tableName}\n`;
    output += `Primary Keys: ${primaryKeys.join(', ') || 'None'}\n`;

    if (foreignKeys.length > 0) {
      output += `Foreign Keys:\n`;
      foreignKeys.forEach(fk => {
        output += `  - ${fk.column} → ${fk.referencedTable}.${fk.referencedColumn}\n`;
      });
    }

    output += `\nColumns:\n`;
    columns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';

      let dataTypeInfo = col.data_type;
      if (col.character_maximum_length) {
        dataTypeInfo += `(${col.character_maximum_length})`;
      } else if (col.numeric_precision && col.numeric_scale !== null) {
        dataTypeInfo += `(${col.numeric_precision},${col.numeric_scale})`;
      }

      output += `  - ${col.column_name}: ${dataTypeInfo} ${nullable}${defaultVal}\n`;
    });

    return output;
  }

  static clearCache(): void {
    this.schemaCache.clear();
    this.cacheTimestamp.clear();
  }
}

export const schemaService = SchemaService;