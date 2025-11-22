/**
 * Database Node Configuration Component
 * Configures database operations (PostgreSQL, MongoDB, MySQL)
 */

import * as React from 'react';
import { Box, FormControl, FormLabel, Input, Textarea, Select, Option, Typography, Tabs, TabList, Tab, TabPanel, IconButton, Alert } from '@mui/joy';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import type { Node } from 'reactflow';

interface DatabaseNodeConfigProps {
  node: Node;
  onChange: (nodeId: string, data: Partial<Node>) => void;
}

export function DatabaseNodeConfig({ node, onChange }: DatabaseNodeConfigProps) {
  const config = node.data?.config || {};
  const [activeTab, setActiveTab] = React.useState(0);

  const handleConfigChange = (key: string, value: any) => {
    onChange(node.id, {
      data: {
        ...node.data,
        config: {
          ...config,
          [key]: value,
        },
      },
    });
  };

  // Parameters management (for SQL queries)
  const parameters = config.parameters || [];

  const addParameter = () => {
    handleConfigChange('parameters', [...parameters, { name: '', value: '' }]);
  };

  const updateParameter = (index: number, field: 'name' | 'value', value: string) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], [field]: value };
    handleConfigChange('parameters', updated);
  };

  const removeParameter = (index: number) => {
    handleConfigChange('parameters', parameters.filter((_: any, i: number) => i !== index));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Database Type */}
      <FormControl>
        <FormLabel>Database Type</FormLabel>
        <Select value={config.dbType || 'postgresql'} onChange={(_, value) => handleConfigChange('dbType', value)}>
          <Option value="postgresql">PostgreSQL</Option>
          <Option value="mysql">MySQL</Option>
          <Option value="mongodb">MongoDB</Option>
          <Option value="sqlite">SQLite</Option>
        </Select>
      </FormControl>

      {/* Connection Configuration */}
      <Box>
        <Typography level="title-sm" sx={{ mb: 1 }}>
          Connection
        </Typography>

        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value as number)}>
          <TabList>
            <Tab>Connection String</Tab>
            <Tab>Individual Fields</Tab>
          </TabList>

          <TabPanel value={0}>
            <FormControl>
              <FormLabel>Connection String</FormLabel>
              <Input
                placeholder={
                  config.dbType === 'postgresql'
                    ? 'postgresql://user:password@localhost:5432/dbname'
                    : config.dbType === 'mysql'
                      ? 'mysql://user:password@localhost:3306/dbname'
                      : config.dbType === 'mongodb'
                        ? 'mongodb://user:password@localhost:27017/dbname'
                        : 'file:./database.db'
                }
                value={config.connectionString || ''}
                onChange={(e) => handleConfigChange('connectionString', e.target.value)}
              />
              <Typography level="body-xs" sx={{ mt: 0.5, color: 'text.tertiary' }}>
                Supports {{`{{variables}}`}} for dynamic connection strings
              </Typography>
            </FormControl>
          </TabPanel>

          <TabPanel value={1}>
            {config.dbType !== 'sqlite' && (
              <>
                <FormControl sx={{ mb: 1.5 }}>
                  <FormLabel>Host</FormLabel>
                  <Input
                    placeholder="localhost"
                    value={config.host || ''}
                    onChange={(e) => handleConfigChange('host', e.target.value)}
                  />
                </FormControl>

                <FormControl sx={{ mb: 1.5 }}>
                  <FormLabel>Port</FormLabel>
                  <Input
                    type="number"
                    placeholder={config.dbType === 'postgresql' ? '5432' : config.dbType === 'mysql' ? '3306' : '27017'}
                    value={config.port || ''}
                    onChange={(e) => handleConfigChange('port', parseInt(e.target.value, 10))}
                  />
                </FormControl>

                <FormControl sx={{ mb: 1.5 }}>
                  <FormLabel>Database Name</FormLabel>
                  <Input
                    placeholder="mydb"
                    value={config.database || ''}
                    onChange={(e) => handleConfigChange('database', e.target.value)}
                  />
                </FormControl>

                <FormControl sx={{ mb: 1.5 }}>
                  <FormLabel>Username</FormLabel>
                  <Input
                    placeholder="dbuser"
                    value={config.username || ''}
                    onChange={(e) => handleConfigChange('username', e.target.value)}
                  />
                </FormControl>

                <FormControl sx={{ mb: 1.5 }}>
                  <FormLabel>Password</FormLabel>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={config.password || ''}
                    onChange={(e) => handleConfigChange('password', e.target.value)}
                  />
                </FormControl>
              </>
            )}

            {config.dbType === 'sqlite' && (
              <FormControl>
                <FormLabel>Database File Path</FormLabel>
                <Input
                  placeholder="./database.db"
                  value={config.dbFilePath || ''}
                  onChange={(e) => handleConfigChange('dbFilePath', e.target.value)}
                />
              </FormControl>
            )}
          </TabPanel>
        </Tabs>
      </Box>

      {/* Operation Type */}
      <FormControl>
        <FormLabel>Operation</FormLabel>
        <Select value={config.operation || 'query'} onChange={(_, value) => handleConfigChange('operation', value)}>
          {(config.dbType === 'postgresql' || config.dbType === 'mysql' || config.dbType === 'sqlite') && (
            <>
              <Option value="query">Query (SELECT)</Option>
              <Option value="insert">Insert</Option>
              <Option value="update">Update</Option>
              <Option value="delete">Delete</Option>
              <Option value="execute">Execute (Raw SQL)</Option>
            </>
          )}
          {config.dbType === 'mongodb' && (
            <>
              <Option value="find">Find (Query)</Option>
              <Option value="findOne">Find One</Option>
              <Option value="insertOne">Insert One</Option>
              <Option value="insertMany">Insert Many</Option>
              <Option value="updateOne">Update One</Option>
              <Option value="updateMany">Update Many</Option>
              <Option value="deleteOne">Delete One</Option>
              <Option value="deleteMany">Delete Many</Option>
              <Option value="aggregate">Aggregate</Option>
            </>
          )}
        </Select>
      </FormControl>

      {/* SQL Configuration */}
      {(config.dbType === 'postgresql' || config.dbType === 'mysql' || config.dbType === 'sqlite') && (
        <Box>
          <FormControl sx={{ mb: 1.5 }}>
            <FormLabel>SQL Query</FormLabel>
            <Textarea
              placeholder={
                config.operation === 'query'
                  ? 'SELECT * FROM users WHERE status = $1'
                  : config.operation === 'insert'
                    ? 'INSERT INTO users (name, email) VALUES ($1, $2)'
                    : config.operation === 'update'
                      ? 'UPDATE users SET status = $1 WHERE id = $2'
                      : config.operation === 'delete'
                        ? 'DELETE FROM users WHERE id = $1'
                        : 'CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT)'
              }
              value={config.query || ''}
              onChange={(e) => handleConfigChange('query', e.target.value)}
              minRows={4}
            />
            <Typography level="body-xs" sx={{ mt: 0.5, color: 'text.tertiary' }}>
              Use parameterized queries ($1, $2, etc.) for safety
            </Typography>
          </FormControl>

          {/* Query Parameters */}
          <Box>
            <Typography level="body-sm" sx={{ mb: 1, fontWeight: 'bold' }}>
              Query Parameters
            </Typography>

            {parameters.map((param: any, index: number) => (
              <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Input
                  placeholder={`$${index + 1} name`}
                  value={param.name || ''}
                  onChange={(e) => updateParameter(index, 'name', e.target.value)}
                  sx={{ flex: 0.3 }}
                />
                <Input
                  placeholder="Value or {{variable}}"
                  value={param.value || ''}
                  onChange={(e) => updateParameter(index, 'value', e.target.value)}
                  sx={{ flex: 0.7 }}
                />
                <IconButton size="sm" color="danger" onClick={() => removeParameter(index)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}

            <IconButton size="sm" variant="outlined" onClick={addParameter} startDecorator={<AddIcon />}>
              Add Parameter
            </IconButton>
          </Box>
        </Box>
      )}

      {/* MongoDB Configuration */}
      {config.dbType === 'mongodb' && (
        <Box>
          <FormControl sx={{ mb: 1.5 }}>
            <FormLabel>Collection</FormLabel>
            <Input
              placeholder="users"
              value={config.collection || ''}
              onChange={(e) => handleConfigChange('collection', e.target.value)}
            />
          </FormControl>

          {config.operation?.includes('find') && (
            <FormControl sx={{ mb: 1.5 }}>
              <FormLabel>Query Filter (JSON)</FormLabel>
              <Textarea
                placeholder='{ "status": "active" } or { "email": "{{trigger.payload.email}}" }'
                value={config.filter || ''}
                onChange={(e) => handleConfigChange('filter', e.target.value)}
                minRows={3}
              />
            </FormControl>
          )}

          {config.operation?.includes('insert') && (
            <FormControl sx={{ mb: 1.5 }}>
              <FormLabel>Document(s) (JSON)</FormLabel>
              <Textarea
                placeholder='{ "name": "{{trigger.payload.name}}", "email": "{{trigger.payload.email}}" }'
                value={config.document || ''}
                onChange={(e) => handleConfigChange('document', e.target.value)}
                minRows={4}
              />
            </FormControl>
          )}

          {config.operation?.includes('update') && (
            <>
              <FormControl sx={{ mb: 1.5 }}>
                <FormLabel>Filter (JSON)</FormLabel>
                <Textarea
                  placeholder='{ "_id": "{{nodes.getId.result}}" }'
                  value={config.filter || ''}
                  onChange={(e) => handleConfigChange('filter', e.target.value)}
                  minRows={2}
                />
              </FormControl>
              <FormControl sx={{ mb: 1.5 }}>
                <FormLabel>Update (JSON)</FormLabel>
                <Textarea
                  placeholder='{ "$set": { "status": "verified" } }'
                  value={config.update || ''}
                  onChange={(e) => handleConfigChange('update', e.target.value)}
                  minRows={3}
                />
              </FormControl>
            </>
          )}

          {config.operation?.includes('delete') && (
            <FormControl sx={{ mb: 1.5 }}>
              <FormLabel>Delete Filter (JSON)</FormLabel>
              <Textarea
                placeholder='{ "status": "inactive" }'
                value={config.filter || ''}
                onChange={(e) => handleConfigChange('filter', e.target.value)}
                minRows={2}
              />
            </FormControl>
          )}

          {config.operation === 'aggregate' && (
            <FormControl sx={{ mb: 1.5 }}>
              <FormLabel>Aggregation Pipeline (JSON Array)</FormLabel>
              <Textarea
                placeholder='[{ "$match": { "status": "active" } }, { "$group": { "_id": "$category", "count": { "$sum": 1 } } }]'
                value={config.pipeline || ''}
                onChange={(e) => handleConfigChange('pipeline', e.target.value)}
                minRows={6}
              />
            </FormControl>
          )}

          {(config.operation?.includes('find') || config.operation === 'aggregate') && (
            <FormControl sx={{ mb: 1.5 }}>
              <FormLabel>Limit (Optional)</FormLabel>
              <Input
                type="number"
                placeholder="100"
                value={config.limit || ''}
                onChange={(e) => handleConfigChange('limit', parseInt(e.target.value, 10))}
              />
            </FormControl>
          )}
        </Box>
      )}

      {/* Connection Pooling */}
      <Box>
        <Typography level="title-sm" sx={{ mb: 1 }}>
          Advanced Options
        </Typography>

        <FormControl sx={{ mb: 1.5 }}>
          <FormLabel>Connection Timeout (ms)</FormLabel>
          <Input
            type="number"
            placeholder="30000"
            value={config.connectionTimeout || ''}
            onChange={(e) => handleConfigChange('connectionTimeout', parseInt(e.target.value, 10))}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Query Timeout (ms)</FormLabel>
          <Input
            type="number"
            placeholder="60000"
            value={config.queryTimeout || ''}
            onChange={(e) => handleConfigChange('queryTimeout', parseInt(e.target.value, 10))}
          />
        </FormControl>
      </Box>

      {/* Security Warning */}
      <Alert color="warning" variant="soft" startDecorator={<WarningIcon />}>
        <Typography level="body-xs">
          <strong>Security:</strong> Never commit credentials to version control. Use environment variables or secure credential storage.
        </Typography>
      </Alert>

      {/* Examples */}
      <Box sx={{ p: 2, bgcolor: 'background.level1', borderRadius: 'sm' }}>
        <Typography level="body-xs" sx={{ fontWeight: 'bold', mb: 1 }}>
          💡 Tips:
        </Typography>
        <Typography level="body-xs" sx={{ fontFamily: 'monospace', color: 'text.secondary', mb: 0.5 }}>
          • Use {{`{{variables}}`}} in queries and connection strings
        </Typography>
        <Typography level="body-xs" sx={{ fontFamily: 'monospace', color: 'text.secondary', mb: 0.5 }}>
          • Always use parameterized queries to prevent SQL injection
        </Typography>
        <Typography level="body-xs" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
          • Test queries with small limits first to avoid performance issues
        </Typography>
      </Box>
    </Box>
  );
}
