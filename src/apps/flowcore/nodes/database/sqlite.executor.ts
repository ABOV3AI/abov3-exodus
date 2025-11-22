/**
 * SQLite Node Executor
 * Execute SQL queries against SQLite database (local file)
 */

import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import type { NodeExecutionResult } from '../../runtime/variable-interpolator';

export interface SQLiteConfig {
  filename: string; // Path to SQLite database file (e.g., './data/workflows.db')
  query: string;
  params?: any[]; // Parameters for parameterized queries
  operation: 'select' | 'insert' | 'update' | 'delete' | 'raw';
  createIfMissing?: boolean; // Create database file if it doesn't exist
}

/**
 * Execute SQLite query
 */
export async function executeSQLiteNode(config: Partial<SQLiteConfig>): Promise<NodeExecutionResult> {
  let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

  try {
    // Validate required fields
    if (!config.filename) {
      throw new Error('Missing SQLite database filename');
    }

    if (!config.query) {
      throw new Error('Missing SQL query');
    }

    // Open database
    db = await open({
      filename: config.filename,
      driver: sqlite3.Database,
    });

    // Execute query
    const startTime = Date.now();
    let result: any;
    let responseData: any = {
      operation: config.operation || 'raw',
      filename: config.filename,
    };

    if (config.operation === 'select' || config.operation === 'raw') {
      // SELECT query - return rows
      if (config.params) {
        result = await db.all(config.query, config.params);
      } else {
        result = await db.all(config.query);
      }
      responseData.rows = result;
      responseData.rowCount = result.length;
    } else {
      // INSERT/UPDATE/DELETE - return changes
      if (config.params) {
        result = await db.run(config.query, config.params);
      } else {
        result = await db.run(config.query);
      }
      responseData.changes = result.changes;
      responseData.lastID = result.lastID;
    }

    const duration = Date.now() - startTime;
    responseData.duration = duration;

    return {
      success: true,
      data: responseData,
      timestamp: new Date(),
    };
  } catch (error: any) {
    return {
      success: false,
      error: `SQLite query failed: ${error.message}`,
      timestamp: new Date(),
    };
  } finally {
    if (db) {
      await db.close();
    }
  }
}

/**
 * Test SQLite connection and create database if needed
 */
export async function testSQLiteConnection(filename: string, createIfMissing: boolean = true): Promise<{ success: boolean; message: string }> {
  let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

  try {
    db = await open({
      filename,
      driver: sqlite3.Database,
    });

    // Test query
    await db.get('SELECT 1 as test');

    await db.close();

    return {
      success: true,
      message: `SQLite connection successful: ${filename}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `SQLite connection failed: ${error.message}`,
    };
  }
}

/**
 * Initialize SQLite database with schema
 */
export async function initSQLiteDatabase(filename: string, schema: string): Promise<{ success: boolean; message: string }> {
  let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

  try {
    db = await open({
      filename,
      driver: sqlite3.Database,
    });

    await db.exec(schema);
    await db.close();

    return {
      success: true,
      message: `SQLite database initialized: ${filename}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `SQLite initialization failed: ${error.message}`,
    };
  }
}
