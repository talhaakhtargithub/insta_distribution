import { Request, Response } from 'express';
import ProxyService from '../../services/proxy/ProxyService';
import ProxyHealthMonitor from '../../services/proxy/ProxyHealthMonitor';
import ProxyRotationManager from '../../services/proxy/ProxyRotationManager';

// ============================================
// PROXY CONTROLLER
// ============================================

export class ProxyController {

  /**
   * POST /api/proxies
   * Create a new proxy
   */
  async createProxy(req: Request, res: Response) {
    try {
      const {
        userId,
        type,
        host,
        port,
        username,
        password,
        country,
        city
      } = req.body;

      // Validation
      if (!userId || !type || !host || !port) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, type, host, port'
        });
      }

      if (!['residential', 'datacenter', 'mobile'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid proxy type. Must be: residential, datacenter, or mobile'
        });
      }

      const proxy = await ProxyService.createProxy(
        userId,
        type,
        host,
        port,
        username,
        password,
        country,
        city
      );

      res.status(201).json({
        success: true,
        data: proxy
      });

    } catch (error: any) {
      console.error('Error creating proxy:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/proxies
   * Get all proxies for a user
   */
  async getProxies(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string || (req as any).user?.id;
      const activeOnly = req.query.activeOnly === 'true';

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const proxies = await ProxyService.getProxiesByUser(userId, activeOnly);

      res.json({
        success: true,
        data: {
          proxies,
          count: proxies.length
        }
      });

    } catch (error: any) {
      console.error('Error getting proxies:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/proxies/:id
   * Get proxy by ID
   */
  async getProxyById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const proxy = await ProxyService.getProxyById(id);

      if (!proxy) {
        return res.status(404).json({
          success: false,
          error: 'Proxy not found'
        });
      }

      res.json({
        success: true,
        data: proxy
      });

    } catch (error: any) {
      console.error('Error getting proxy:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * PUT /api/proxies/:id
   * Update proxy configuration
   */
  async updateProxy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const proxy = await ProxyService.updateProxy(id, updates);

      res.json({
        success: true,
        data: proxy
      });

    } catch (error: any) {
      console.error('Error updating proxy:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/proxies/:id
   * Delete proxy
   */
  async deleteProxy(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await ProxyService.deleteProxy(id);

      res.json({
        success: true,
        message: 'Proxy deleted successfully'
      });

    } catch (error: any) {
      console.error('Error deleting proxy:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/proxies/:id/test
   * Test proxy connection
   */
  async testProxy(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const proxy = await ProxyService.getProxyById(id);

      if (!proxy) {
        return res.status(404).json({
          success: false,
          error: 'Proxy not found'
        });
      }

      const testResult = await ProxyService.testProxy(proxy);

      res.json({
        success: true,
        data: testResult
      });

    } catch (error: any) {
      console.error('Error testing proxy:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/proxies/:id/assign/:accountId
   * Assign proxy to account
   */
  async assignProxy(req: Request, res: Response) {
    try {
      const { id, accountId } = req.params;

      await ProxyService.assignProxyToAccount(id, accountId);

      res.json({
        success: true,
        message: 'Proxy assigned successfully'
      });

    } catch (error: any) {
      console.error('Error assigning proxy:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/proxies/unassign/:accountId
   * Unassign proxy from account
   */
  async unassignProxy(req: Request, res: Response) {
    try {
      const { accountId } = req.params;

      await ProxyService.unassignProxyFromAccount(accountId);

      res.json({
        success: true,
        message: 'Proxy unassigned successfully'
      });

    } catch (error: any) {
      console.error('Error unassigning proxy:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/proxies/stats
   * Get proxy statistics
   */
  async getStats(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string || (req as any).user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const stats = await ProxyService.getProxyStats(userId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error: any) {
      console.error('Error getting proxy stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/proxies/health/check
   * Check health of all proxies
   */
  async checkHealth(req: Request, res: Response) {
    try {
      const userId = req.body.userId || (req as any).user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const report = await ProxyHealthMonitor.checkAllProxiesHealth(userId);

      res.json({
        success: true,
        data: report
      });

    } catch (error: any) {
      console.error('Error checking proxy health:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/proxies/:id/health/check
   * Check health of specific proxy
   */
  async checkProxyHealth(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const proxy = await ProxyService.getProxyById(id);

      if (!proxy) {
        return res.status(404).json({
          success: false,
          error: 'Proxy not found'
        });
      }

      const result = await ProxyHealthMonitor.checkProxyHealth(proxy);

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      console.error('Error checking proxy health:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/proxies/rotate/:accountId
   * Rotate proxy for specific account
   */
  async rotateProxy(req: Request, res: Response) {
    try {
      const { accountId } = req.params;
      const userId = req.body.userId || (req as any).user?.id;
      const strategy = req.body.strategy || { type: 'least-loaded' };

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const result = await ProxyRotationManager.rotateProxyForAccount(accountId, userId, strategy);

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      console.error('Error rotating proxy:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/proxies/rotate/auto
   * Auto-rotate proxies based on usage
   */
  async autoRotate(req: Request, res: Response) {
    try {
      const userId = req.body.userId || (req as any).user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const results = await ProxyRotationManager.autoRotateProxies(userId);

      res.json({
        success: true,
        data: {
          rotations: results,
          count: results.length
        }
      });

    } catch (error: any) {
      console.error('Error auto-rotating proxies:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/proxies/rotate/group/:groupId
   * Rotate proxies for all accounts in a group
   */
  async rotateGroupProxies(req: Request, res: Response) {
    try {
      const { groupId } = req.params;
      const userId = req.body.userId || (req as any).user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const results = await ProxyRotationManager.rotateGroupProxies(groupId, userId);

      res.json({
        success: true,
        data: {
          rotations: results,
          count: results.length
        }
      });

    } catch (error: any) {
      console.error('Error rotating group proxies:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/proxies/rotation/stats
   * Get rotation statistics
   */
  async getRotationStats(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string || (req as any).user?.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const stats = await ProxyRotationManager.getRotationStats(userId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error: any) {
      console.error('Error getting rotation stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/proxies/:id/performance
   * Get proxy performance metrics
   */
  async getProxyPerformance(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const metrics = await ProxyHealthMonitor.getProxyPerformanceMetrics(id);

      res.json({
        success: true,
        data: metrics
      });

    } catch (error: any) {
      console.error('Error getting proxy performance:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/proxies/:id/trend
   * Get proxy health trend
   */
  async getProxyTrend(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const trend = await ProxyHealthMonitor.getProxyHealthTrend(id);

      res.json({
        success: true,
        data: trend
      });

    } catch (error: any) {
      console.error('Error getting proxy trend:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default new ProxyController();
