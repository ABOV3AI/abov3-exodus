/**
 * PostgreSQL Node Executor
 * Execute SQL queries against PostgreSQL database
 */

import { Client } from 'pg';
import type { NodeExecutionResult } from '../../runtime/variable-interpolator';

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  query: string;
  params?: any[]; // Parameters for parameterized queries
  operation: 'select' | 'insert' | 'update' | 'delete' | 'raw';
}

/**
 * Execute PostgreSQL query
 */
export async function executePostgresNode(config: Partial<PostgresConfig>): Promise<NodeExecutionResult> {
  const client = new Client({
    host: config.host,
    port: config.port || 5432,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
  });

  try {
    // Validate required fields
    if (!config.host || !config.database || !config.user || !config.password) {
      throw new Error('Missing database connection details (host, database, user, password)');
    }

    if (!config.query) {
      throw new Error('Missing SQL query');
    }

    // Connect to database
    await client.connect();

    // Execute query
    const startTime = Date.now();
    const result = config.params
      ? await client.query(config.query, config.params)
      : await client.query(config.query);
    const duration = Date.now() - startTime;

    // Format response based on operation type
    let responseData: any = {
      rowCount: result.rowCount,
      duration,
      operation: config.operation || 'raw',
    };

    if (config.operation === 'select' || !config.operation || config.operation === 'raw') {
      responseData.rows = result.rows;
      responseData.fields = result.fields?.map(f => f.name);
    } else if (config.operation === 'insert' || config.operation === 'update') {
      responseData.affectedRows = result.rowCount;
      responseData.command = result.command;
    } else if (config.operation === 'delete') {
      responseData.deletedRows = result.rowCount;
    }

    return {
      success: true,
      data: responseData,
      timestamp: new Date(),
    };
  } catch (error: any) {
    return {
      success: false,
      error: `PostgreSQL query failed: ${error.message}`,
      timestamp: new Date(),
    };
  } finally {
    await client.end();
  }
}

/**
 * Test PostgreSQL connection
 */
export async function testPostgresConnection(config: Partial<PostgresConfig>): Promise<{ success: boolean; message: string }> {
  const client = new Client({
    host: config.host,
    port: config.port || 5432,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    const result = await client.query('SELECT version()');
    await client.end();
    return {
      success: true,
      message: `PostgreSQL connection successful: ${result.rows[0].version}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `PostgreSQL connection failed: ${error.message}`,
    };
  }
}
