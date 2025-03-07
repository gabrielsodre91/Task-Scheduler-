import { Router } from 'express';
import { getDatabase } from '../db/database';

const router = Router();

// Rota básica de health check
router.get('/', async (req, res) => {
  res.json({ status: 'up', version: '1.0.0' });
});

// Health check detalhado com verificação de banco de dados
router.get('/detailed', async (req, res) => {
  try {
    const startTime = Date.now();
    const db = await getDatabase();
    const dbResult = await db.get('SELECT 1 as alive');
    const responseTime = Date.now() - startTime;
    
    if (dbResult && dbResult.alive === 1) {
      res.json({
        status: 'up',
        version: '1.0.0',
        components: {
          database: { status: 'up', responseTime: `${responseTime}ms` },
          api: { status: 'up' }
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        status: 'degraded',
        components: {
          database: { status: 'down' },
          api: { status: 'up' }
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Estatísticas do sistema
router.get('/stats', async (req, res) => {
  try {
    const db = await getDatabase();
    const [totalTasks, pendingTasks, executedTasks, failedTasks] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM tasks'),
      db.get('SELECT COUNT(*) as count FROM tasks WHERE status = ?', 'pending'),
      db.get('SELECT COUNT(*) as count FROM tasks WHERE status = ?', 'executed'),
      db.get('SELECT COUNT(*) as count FROM tasks WHERE status = ?', 'failed')
    ]);
    
    const memoryUsage = process.memoryUsage();
    
    res.json({
      tasks: {
        total: totalTasks?.count || 0,
        pending: pendingTasks?.count || 0,
        executed: executedTasks?.count || 0,
        failed: failedTasks?.count || 0
      },
      system: {
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
        },
        uptime: `${Math.round(process.uptime() / 60)} minutes`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get system stats:', error);
    res.status(500).json({ error: 'Failed to get system statistics' });
  }
});

export default router;
