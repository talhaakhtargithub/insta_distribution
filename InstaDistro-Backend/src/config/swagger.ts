export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Instagram Swarm Distribution API',
    version: '1.0.0',
    description: 'Complete API for managing 100+ Instagram accounts with automated posting, warmup, health monitoring, and distribution',
    contact: {
      name: 'API Support',
      email: 'support@instadistro.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    },
    {
      url: 'https://api.instadistro.com',
      description: 'Production server'
    }
  ],
  tags: [
    { name: 'Accounts', description: 'Instagram account management' },
    { name: 'Posts', description: 'Post creation and management' },
    { name: 'Warmup', description: 'Account warmup automation' },
    { name: 'Groups', description: 'Account group management' },
    { name: 'Health', description: 'Health monitoring and alerts' },
    { name: 'Proxies', description: 'Proxy management and rotation' },
    { name: 'Schedules', description: 'Advanced scheduling and calendar' },
    { name: 'Variations', description: 'Content variation engine' },
    { name: 'Distribution', description: 'Smart distribution engine' },
    { name: 'OAuth', description: 'Authentication and authorization' }
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        description: 'Check API and database connectivity',
        tags: ['System'],
        responses: {
          200: {
            description: 'System is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                    database: { type: 'string', example: 'connected' },
                    uptime: { type: 'number' },
                    environment: { type: 'string' },
                    version: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/accounts': {
      get: {
        summary: 'List all accounts',
        tags: ['Accounts'],
        parameters: [
          {
            name: 'userId',
            in: 'query',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: {
            description: 'List of accounts',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        accounts: { type: 'array', items: { type: 'object' } },
                        total: { type: 'number' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create new account',
        tags: ['Accounts'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId', 'username', 'password'],
                properties: {
                  userId: { type: 'string' },
                  username: { type: 'string' },
                  password: { type: 'string' },
                  accountType: { type: 'string', enum: ['personal', 'business'] }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Account created successfully'
          }
        }
      }
    },
    '/api/health/swarm': {
      get: {
        summary: 'Get swarm health overview',
        tags: ['Health'],
        parameters: [
          {
            name: 'userId',
            in: 'query',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: {
            description: 'Swarm health data'
          }
        }
      }
    },
    '/api/proxies': {
      get: {
        summary: 'List all proxies',
        tags: ['Proxies'],
        parameters: [
          {
            name: 'userId',
            in: 'query',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: {
            description: 'List of proxies'
          }
        }
      },
      post: {
        summary: 'Create new proxy',
        tags: ['Proxies'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId', 'type', 'host', 'port'],
                properties: {
                  userId: { type: 'string' },
                  type: { type: 'string', enum: ['residential', 'datacenter', 'mobile'] },
                  host: { type: 'string' },
                  port: { type: 'number' },
                  username: { type: 'string' },
                  password: { type: 'string' },
                  country: { type: 'string' },
                  city: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Proxy created successfully'
          }
        }
      }
    },
    '/api/schedules': {
      get: {
        summary: 'List all schedules',
        tags: ['Schedules'],
        parameters: [
          {
            name: 'userId',
            in: 'query',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: {
            description: 'List of schedules'
          }
        }
      },
      post: {
        summary: 'Create new schedule',
        tags: ['Schedules'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId', 'videoId', 'videoUri', 'accountIds', 'scheduleType'],
                properties: {
                  userId: { type: 'string' },
                  videoId: { type: 'string' },
                  videoUri: { type: 'string' },
                  accountIds: { type: 'array', items: { type: 'string' } },
                  scheduleType: { type: 'string', enum: ['one-time', 'recurring', 'queue', 'bulk'] },
                  scheduledTime: { type: 'string', format: 'date-time' },
                  caption: { type: 'string' },
                  hashtags: { type: 'array', items: { type: 'string' } }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Schedule created successfully'
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' }
        }
      },
      Success: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' }
        }
      }
    }
  }
};
