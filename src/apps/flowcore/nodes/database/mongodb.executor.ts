/**
 * MongoDB Node Executor
 * Execute operations against MongoDB database
 */

import { MongoClient } from 'mongodb';
import type { NodeExecutionResult } from '../../runtime/variable-interpolator';

export interface MongoDBConfig {
  uri: string; // MongoDB connection string (mongodb://... or mongodb+srv://...)
  database: string;
  collection: string;
  operation: 'find' | 'findOne' | 'insertOne' | 'insertMany' | 'updateOne' | 'updateMany' | 'deleteOne' | 'deleteMany' | 'aggregate';
  // Query/filter
  filter?: Record<string, any>;
  // Document(s) for insert operations
  document?: Record<string, any>;
  documents?: Array<Record<string, any>>;
  // Update operations
  update?: Record<string, any>;
  // Aggregation pipeline
  pipeline?: Array<Record<string, any>>;
  // Options
  options?: Record<string, any>;
  limit?: number;
  skip?: number;
  sort?: Record<string, any>;
}

/**
 * Execute MongoDB operation
 */
export async function executeMongoDBNode(config: Partial<MongoDBConfig>): Promise<NodeExecutionResult> {
  const client = new MongoClient(config.uri || '');

  try {
    // Validate required fields
    if (!config.uri) {
      throw new Error('Missing MongoDB connection URI');
    }

    if (!config.database || !config.collection) {
      throw new Error('Missing database or collection name');
    }

    if (!config.operation) {
      throw new Error('Missing operation type');
    }

    // Connect to MongoDB
    await client.connect();
    const db = client.db(config.database);
    const collection = db.collection(config.collection);

    const startTime = Date.now();
    let result: any;
    let responseData: any = {
      operation: config.operation,
      collection: config.collection,
      database: config.database,
    };

    // Execute operation based on type
    switch (config.operation) {
      case 'find': {
        const cursor = collection.find(config.filter || {}, config.options);
        if (config.sort) cursor.sort(config.sort);
        if (config.skip) cursor.skip(config.skip);
        if (config.limit) cursor.limit(config.limit);
        result = await cursor.toArray();
        responseData.documents = result;
        responseData.count = result.length;
        break;
      }

      case 'findOne': {
        result = await collection.findOne(config.filter || {}, config.options);
        responseData.document = result;
        responseData.found = !!result;
        break;
      }

      case 'insertOne': {
        if (!config.document) {
          throw new Error('Missing document for insertOne operation');
        }
        result = await collection.insertOne(config.document, config.options);
        responseData.insertedId = result.insertedId;
        responseData.acknowledged = result.acknowledged;
        break;
      }

      case 'insertMany': {
        if (!config.documents || config.documents.length === 0) {
          throw new Error('Missing documents for insertMany operation');
        }
        result = await collection.insertMany(config.documents, config.options);
        responseData.insertedCount = result.insertedCount;
        responseData.insertedIds = result.insertedIds;
        responseData.acknowledged = result.acknowledged;
        break;
      }

      case 'updateOne': {
        if (!config.update) {
          throw new Error('Missing update object for updateOne operation');
        }
        result = await collection.updateOne(config.filter || {}, config.update, config.options);
        responseData.matchedCount = result.matchedCount;
        responseData.modifiedCount = result.modifiedCount;
        responseData.upsertedId = result.upsertedId;
        responseData.acknowledged = result.acknowledged;
        break;
      }

      case 'updateMany': {
        if (!config.update) {
          throw new Error('Missing update object for updateMany operation');
        }
        result = await collection.updateMany(config.filter || {}, config.update, config.options);
        responseData.matchedCount = result.matchedCount;
        responseData.modifiedCount = result.modifiedCount;
        responseData.upsertedCount = result.upsertedCount;
        responseData.acknowledged = result.acknowledged;
        break;
      }

      case 'deleteOne': {
        result = await collection.deleteOne(config.filter || {}, config.options);
        responseData.deletedCount = result.deletedCount;
        responseData.acknowledged = result.acknowledged;
        break;
      }

      case 'deleteMany': {
        result = await collection.deleteMany(config.filter || {}, config.options);
        responseData.deletedCount = result.deletedCount;
        responseData.acknowledged = result.acknowledged;
        break;
      }

      case 'aggregate': {
        if (!config.pipeline || config.pipeline.length === 0) {
          throw new Error('Missing aggregation pipeline');
        }
        result = await collection.aggregate(config.pipeline, config.options).toArray();
        responseData.documents = result;
        responseData.count = result.length;
        break;
      }

      default:
        throw new Error(`Unknown operation: ${config.operation}`);
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
      error: `MongoDB operation failed: ${error.message}`,
      timestamp: new Date(),
    };
  } finally {
    await client.close();
  }
}

/**
 * Test MongoDB connection
 */
export async function testMongoDBConnection(uri: string, database: string): Promise<{ success: boolean; message: string }> {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(database);
    await db.command({ ping: 1 });
    await client.close();

    return {
      success: true,
      message: `MongoDB connection successful to database: ${database}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `MongoDB connection failed: ${error.message}`,
    };
  }
}
