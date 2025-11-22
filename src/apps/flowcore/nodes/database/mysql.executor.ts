/**
 * MySQL Node Executor
 * Execute SQL queries against MySQL database
 */

import mysql from 'mysql2/promise';
import type { NodeExecutionResult } from '../../runtime/variable-interpolator';

export interface MySQLConfig {
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
 * Execute MySQL query
 */
export async function executeMySQLNode(config: Partial<MySQLConfig>): Promise<NodeExecutionResult> {
  let connection: mysql.Connection | null = null;

  try {
    // Validate required fields
    if (!config.host || !config.database || !config.user || !config.password) {
      throw new Error('Missing database connection details (host, database, user, password)');
    }

    if (!config.query) {
      throw new Error('Missing SQL query');
    }

    // Create connection
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port || 3306,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? {} : undefined,
    });

    // Execute query
    const startTime = Date.now();
    const [result, fields] = config.params
      ? await connection.execute(config.query, config.params)
      : await connection.query(config.query);
    const duration = Date.now() - startTime;

    // Format response based on operation type
    let responseData: any = {
      duration,
      operation: config.operation || 'raw',
    };

    if (Array.isArray(result)) {
      // SELECT query
      responseData.rows = result;
      responseData.rowCount = result.length;
      responseData.fields = fields?.map((f: any) => f.name);
    } else {
      // INSERT/UPDATE/DELETE query
      const resultObj = result as any;
      responseData.affectedRows = resultObj.affectedRows;
      responseData.insertId = resultObj.insertId;
      responseData.warningCount = resultObj.warningCount;
    }

    return {
      success: true,
      data: responseData,
      timestamp: new Date(),
    };
  } catch (error: any) {
    return {
      success: false,
      error: `MySQL query failed: ${error.message}`,
      timestamp: new Date(),
    };
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Test MySQL connection
 */
export async function testMySQLConnection(config: Partial<MySQLConfig>): Promise<{ success: boolean; message: string }> {
  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port || 3306,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? {} : undefined,
    });

    const [rows] = await connection.query('SELECT VERSION() as version');
    const version = (rows as any[])[0].version;

    await connection.end();

    return {
      success: true,
      message: `MySQL connection successful: ${version}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `MySQL connection failed: ${error.message}`,
    };
  }
}
