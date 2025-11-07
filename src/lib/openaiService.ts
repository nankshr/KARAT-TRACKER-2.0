import { TableSchema, schemaService } from './schemaService';
import { DataMaskingService } from './dataMasking';

interface QueryContext {
  tableName: string; // Legacy field for backward compatibility
  relevantTables: string[]; // New field for multi-table support
  detectedIntent: string; // What the user is trying to analyze
  columns: string[];
  sampleData: any[];
  dateRange?: {
    from: string;
    to: string;
  };
  tableSchemas: Record<string, TableSchema>; // Multiple table schemas
}

interface QueryResponse {
  sql: string;
  explanation: string;
  summary: string;
  expectedResultType?: 'aggregation' | 'list' | 'single_value';
}

class TableDetectionService {
  private static readonly TABLE_KEYWORDS = {
    sales_log: [
      'sales', 'sell', 'sold', 'revenue', 'income', 'customer', 'profit', 'loss',
      'material', 'gold', 'silver', 'jewelry', 'wholesale', 'retail', 'purchase',
      'selling', 'purity', 'weight', 'grams', 'wastage', 'tag', 'item'
    ],
    expense_log: [
      'expense', 'cost', 'spend', 'spent', 'expenditure', 'outgoing', 'payment',
      'direct', 'indirect', 'credit', 'is_credit', 'bills', 'overhead', 'udhaar', 'udhar'
    ],
    daily_rates: [
      'rate', 'price', 'rates', 'pricing', 'market', 'daily', 'karat', '22k', '24k', '18k',
      'gold rate', 'silver rate', 'market price', 'current rate'
    ],
    activity_log: [
      'activity', 'log', 'audit', 'tracking', 'user', 'action', 'history', 'changes'
    ]
  };

  static analyzeQuery(query: string): { relevantTables: string[], detectedIntent: string } {
    const queryLower = query.toLowerCase();
    const relevantTables: string[] = [];
    let detectedIntent = 'general_analysis';

    // Score each table based on keyword matches
    const tableScores: Record<string, number> = {};

    for (const [tableName, keywords] of Object.entries(this.TABLE_KEYWORDS)) {
      let score = 0;
      for (const keyword of keywords) {
        if (queryLower.includes(keyword)) {
          score += keyword.length; // Longer keywords get higher weight
        }
      }
      tableScores[tableName] = score;
    }

    // Add tables with non-zero scores
    for (const [tableName, score] of Object.entries(tableScores)) {
      if (score > 0) {
        relevantTables.push(tableName);
      }
    }

    // Default to sales_log if no tables detected (most common use case)
    if (relevantTables.length === 0) {
      relevantTables.push('sales_log');
    }

    // Detect intent based on query patterns
    if (queryLower.includes('profit') || queryLower.includes('loss') || queryLower.includes('earning')) {
      detectedIntent = 'profit_analysis';
    } else if (queryLower.includes('expense') || queryLower.includes('cost') || queryLower.includes('spend')) {
      detectedIntent = 'expense_analysis';
    } else if (queryLower.includes('rate') || queryLower.includes('price') || queryLower.includes('market')) {
      detectedIntent = 'rate_analysis';
    } else if (queryLower.includes('compare') || queryLower.includes('vs') || queryLower.includes('versus')) {
      detectedIntent = 'comparative_analysis';
    } else if (queryLower.includes('total') || queryLower.includes('sum') || queryLower.includes('amount')) {
      detectedIntent = 'aggregation_analysis';
    }

    // Add expense_log for financial overview queries
    if ((detectedIntent === 'profit_analysis' || queryLower.includes('financial') || queryLower.includes('overview'))
        && !relevantTables.includes('expense_log')) {
      relevantTables.push('expense_log');
    }

    // Add daily_rates for rate-related queries
    if ((detectedIntent === 'profit_analysis' || queryLower.includes('rate') || queryLower.includes('price'))
        && !relevantTables.includes('daily_rates')) {
      relevantTables.push('daily_rates');
    }

    return { relevantTables, detectedIntent };
  }
}

export class OpenAIService {
  private apiKey: string;
  private baseURL = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!this.apiKey) {
      throw new Error('OpenAI API key not found. Please add VITE_OPENAI_API_KEY to your .env file');
    }
  }

  async generateSQLQuery(query: string, context: QueryContext): Promise<QueryResponse> {
    // Preprocess query to handle local terminology mapping
    const preprocessedQuery = this.preprocessQuery(query);

    // Use table detection service to identify relevant tables
    const { relevantTables, detectedIntent } = TableDetectionService.analyzeQuery(preprocessedQuery);

    // Update context with detected information
    const enhancedContext: QueryContext = {
      ...context,
      relevantTables,
      detectedIntent,
      tableSchemas: {}
    };

    // Fetch schemas for all relevant tables
    for (const tableName of relevantTables) {
      try {
        enhancedContext.tableSchemas[tableName] = await schemaService.getTableSchema(tableName);
      } catch (error) {
        console.warn(`Failed to fetch schema for ${tableName}, proceeding without schema`);
      }
    }

    const prompt = this.buildPrompt(preprocessedQuery, enhancedContext);

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Options: 'gpt-3.5-turbo', 'gpt-4o-mini', 'gpt-4o', 'gpt-4'
          messages: [
            {
              role: 'system',
              content: 'You are a SQL expert who generates safe, read-only SQL queries based on natural language requests. Only generate SELECT statements. Never use DROP, DELETE, UPDATE, INSERT, or any destructive operations. IMPORTANT: You must respect customer privacy - never include actual customer names or phone numbers in examples, and focus on business analytics rather than individual customer details.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return this.parseResponse(content);
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate SQL query. Please try again.');
    }
  }

  private preprocessQuery(query: string): string {
    // Handle local terminology mapping
    let processedQuery = query;

    // Map "udhaar" and its variations to "credit" for better AI understanding
    const udhaarVariations = /\b(udhaar|udhar|udhaar\s+transactions?|udhar\s+transactions?)\b/gi;
    processedQuery = processedQuery.replace(udhaarVariations, 'credit transactions');

    return processedQuery;
  }

  async transcribeAudio(audioBlob: Blob): Promise<string> {
    try {
      console.log('Transcribing audio blob:', {
        size: audioBlob.size,
        type: audioBlob.type
      });

      // Convert blob to proper format for Whisper
      const fileName = audioBlob.type.includes('webm') ? 'audio.webm' :
                      audioBlob.type.includes('mp4') ? 'audio.mp4' : 'audio.wav';

      const formData = new FormData();
      formData.append('file', audioBlob, fileName);
      formData.append('model', 'whisper-1');

      // Try without language forcing first - let Whisper auto-detect
      // formData.append('language', 'en');

      // Remove business context prompt - might be too restrictive
      // formData.append('prompt', 'This is a business query about sales, profits, expenses, or financial data.');

      // Use default temperature
      // formData.append('temperature', '0');

      console.log('Sending request to Whisper API...');
      const response = await fetch(`${this.baseURL}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      console.log('Whisper API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Whisper API error response:', errorText);
        throw new Error(`Whisper API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Whisper API response data:', data);

      const transcription = data.text || '';
      console.log('Final transcription:', transcription);

      return transcription;
    } catch (error) {
      console.error('Audio transcription error:', error);
      throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateSummary(query: string, results: any[]): Promise<string> {
    if (results.length === 0) {
      return "No data found matching your query criteria.";
    }

    // *** PRIVACY PROTECTION: Mask sensitive customer data before sending to LLM ***
    const maskedResults = DataMaskingService.maskQueryResults(results);
    const safeDataDescription = DataMaskingService.createSafeDataDescription(results);

    // Use masked data for analysis
    const resultSample = maskedResults.slice(0, 10);
    const resultColumns = Object.keys(results[0] || {});
    const resultCount = results.length;

    // Check for common aggregation patterns
    const hasAggregations = resultColumns.some(col =>
      col.includes('total_') || col.includes('sum_') || col.includes('count_') || col.includes('avg_')
    );

    const prompt = `
Based on the original user query: "${query}"
${safeDataDescription}

PRIVACY NOTE: Customer names and phone numbers have been masked in the data below for privacy protection.

Sample results (with masked personal data): ${JSON.stringify(resultSample, null, 2)}

Generate a very brief 2-line summary that:
1. States the key finding in response to the user's question
2. Uses Indian Rupee (₹) formatting for currency values
3. Keep it under 50 words total
4. Be direct and specific
5. Do NOT include any customer names or phone numbers in your response

${hasAggregations ? 'Focus only on the main aggregated value and its business meaning.' : 'Mention the most important data point found.'}

Format: Line 1 = Main result, Line 2 = Brief business insight.
`;

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Options: 'gpt-3.5-turbo', 'gpt-4o-mini', 'gpt-4o', 'gpt-4'
          messages: [
            {
              role: 'system',
              content: 'You are a business analyst who creates clear, concise summaries of data analysis results. Always reference the original user question in your response.'
            },
            {
              role: 'user',
              content: `Original User Question: "${query}"\n\n${prompt}`
            }
          ],
          temperature: 0.3,
          max_tokens: 200,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const summary = data.choices[0]?.message?.content || 'Summary generation failed.';
      return summary;
    } catch (error) {
      console.error('Summary generation error:', error);
      return `Found ${results.length} records matching your query.`;
    }
  }

  private buildPrompt(query: string, context: QueryContext): string {
    const { dateRange, sampleData, relevantTables, detectedIntent, tableSchemas } = context;

    // *** PRIVACY PROTECTION: Mask sensitive data in sample data ***
    const maskedSampleData = sampleData && sampleData.length > 0
      ? DataMaskingService.maskSampleData(sampleData)
      : [];

    // Analyze if the query mentions dates, time periods, or specific ranges
    const queryLower = query.toLowerCase();
    const hasDatesInQuery = /\b(today|yesterday|this month|last month|this week|last week|this year|last year|between|from|to|since|until|ago|recent|latest|current)\b/.test(queryLower) ||
                           /\b\d{4}-\d{2}-\d{2}\b/.test(query) || // Date format YYYY-MM-DD
                           /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(queryLower);

    let dateContext = '';
    if (hasDatesInQuery && dateRange) {
      dateContext = `- Available date range: ${dateRange.from} to ${dateRange.to}\n- Use this date range in your WHERE clauses when dates are mentioned\n`;
    }

    // Add sample data context if available (with masked sensitive data)
    let sampleDataContext = '';
    if (maskedSampleData.length > 0) {
      sampleDataContext = `\nSample Data (with customer information masked for privacy):\n${JSON.stringify(maskedSampleData, null, 2)}\n`;
    }

    // Build dynamic table schemas section
    let tableSchemaSection = '';
    if (relevantTables && relevantTables.length > 0) {
      tableSchemaSection = 'RELEVANT TABLES DETECTED FOR YOUR QUERY:\n';

      for (const tableName of relevantTables) {
        const schema = tableSchemas[tableName];
        if (schema) {
          tableSchemaSection += schemaService.formatSchemaForAI(schema) + '\n';
        } else {
          // Fallback for missing schemas
          tableSchemaSection += `\nTable: ${tableName}\n(Schema details unavailable)\n`;
        }
      }
    } else {
      // Fallback to all tables if detection failed
      tableSchemaSection = `
AVAILABLE TABLES & RELATIONSHIPS:
You can query ANY of these tables and JOIN them as needed (exclude 'users' table for security):

1. sales_log - Main sales transactions
2. expense_log - Business expenses
3. daily_rates - Daily precious metal rates
4. activity_log - System activity tracking
`;
    }

    return `
Generate a PostgreSQL SELECT query for this request: "${query}"

ANALYSIS CONTEXT:
- Detected Intent: ${detectedIntent || 'general_analysis'}
- Relevant Tables: ${relevantTables?.join(', ') || 'sales_log'}

${tableSchemaSection}

BUSINESS RELATIONSHIPS:
- sales_log.material connects to daily_rates.material (gold/silver)
- sales_log.asof_date can be joined with daily_rates.asof_date for rate analysis
- expense_log.asof_date for expense analysis on same dates
- All tables have date fields for temporal analysis

Database Context:
${dateContext}${sampleDataContext}

PRIVACY & SECURITY REQUIREMENTS:
⚠️  IMPORTANT: This system handles sensitive customer data. Follow these rules:
- Customer names and phone numbers are masked in any sample data provided
- NEVER include actual customer names or phone numbers in query examples
- Use generic placeholders like 'customer_name' and 'customer_phone' in column references
- Focus on business analytics rather than individual customer details

Business Context:
- This is a jewelry business tracking sales, expenses, and daily rates
- Materials are 'gold' and 'silver'
- Transaction types are 'wholesale' and 'retail'
- Profits = selling cost - purchase cost (considering old materials)
- Currency is Indian Rupees (₹)

Business Logic Rules:
- profit = selling_cost - purchase_cost + old_material_profit
- purchase_weight_grams: Weight in grams (with up to 3 decimal precision)
- purchase_purity/selling_purity: Purity percentage (e.g., 91.6 for 22k gold)
- wastage: Additional percentage for retail sales
- asof_date: Transaction date (YYYY-MM-DD format)
- created_at: System timestamp when record was created
- is_credit: Boolean indicating credit transactions (also known as "udhaar" locally)

IMPORTANT TERMINOLOGY MAPPING:
- When users mention "udhaar" or "udhar", they are referring to the "is_credit" field in expense_log table
- "udhaar" is the local Hindi/Urdu term for credit transactions or unpaid expenses
- In SQL queries, always use "is_credit" column name, not "udhaar"
- When filtering for udhaar/credit expenses: WHERE is_credit = true
- When filtering for paid expenses: WHERE is_credit = false

QUERY GENERATION RULES:
1. ONLY generate SELECT statements - never INSERT, UPDATE, DELETE, DROP
2. Use proper PostgreSQL syntax with correct data types
3. You can JOIN multiple tables to answer complex questions
4. Only include date filtering if the user query mentions dates, time periods, or ranges
5. For queries without date mentions, query all available data
6. Use appropriate JOINs when data from multiple tables is needed
7. Use LIMIT for general queries to avoid overwhelming results (suggest 20-50 for data browsing)
8. Use appropriate ORDER BY for meaningful results
9. Handle NULL values in calculations using COALESCE or IS NOT NULL
10. Format the response as JSON with these fields:
    - sql: the SQL query
    - explanation: brief explanation of what the query does
    - summary: what business insight this provides

Example formats:
{
  "sql": "SELECT s.material, SUM(s.profit) as total_profit, AVG(d.new_price_per_gram) as avg_rate FROM sales_log s LEFT JOIN daily_rates d ON s.material = d.material AND s.asof_date = d.asof_date WHERE s.profit IS NOT NULL GROUP BY s.material ORDER BY total_profit DESC",
  "explanation": "Analyzes total profit by material with average daily rates",
  "summary": "Shows which materials are most profitable and their corresponding market rates",
  "expectedResultType": "aggregation"
}

For udhaar/credit queries:
{
  "sql": "SELECT SUM(cost) as total_udhaar, COUNT(*) as udhaar_transactions FROM expense_log WHERE is_credit = true",
  "explanation": "Calculates total unpaid expenses (udhaar) and count of credit transactions",
  "summary": "Shows total outstanding credit amounts that need to be paid",
  "expectedResultType": "aggregation"
}

Additional Notes:
- For queries asking about "highest" or "maximum" values, include MAX() functions
- For rate queries, use daily_rates table with new_price_per_gram or old_price_per_gram columns
- For expense vs income analysis, JOIN sales_log and expense_log
- Always provide meaningful summaries that explain business implications
- Set expectedResultType as "aggregation" for SUM/AVG/COUNT, "list" for multiple rows, "single_value" for single results
`;
  }

  private parseResponse(content: string): QueryResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          sql: parsed.sql || '',
          explanation: parsed.explanation || 'Generated SQL query based on your request',
          summary: parsed.summary || 'Custom query to analyze your business data',
          expectedResultType: parsed.expectedResultType || 'list'
        };
      }
    } catch (error) {
      console.error('Failed to parse OpenAI response as JSON:', error);
      console.log('Raw OpenAI response:', content);
    }

    // Fallback: try to extract SQL from code blocks
    const sqlMatch = content.match(/```sql\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
    const sql = sqlMatch ? sqlMatch[1].trim() : content.trim();

    // Try to extract explanation and summary from the content
    let explanation = 'Generated SQL query based on your request';
    let summary = 'Custom query to analyze your business data';

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('explanation') || line.includes('this query')) {
        explanation = lines[i + 1]?.trim() || explanation;
      }
      if (line.includes('summary') || line.includes('insight') || line.includes('shows')) {
        summary = lines[i + 1]?.trim() || lines[i]?.replace(/summary:?/i, '').trim() || summary;
      }
    }

    return {
      sql,
      explanation,
      summary,
      expectedResultType: 'list'
    };
  }
}

export const openaiService = new OpenAIService();