import express from 'express';
import cors from 'cors';
import taskRouter from './routes/taskRoutes';
import healthRouter from './routes/healthRoutes'; // Removido o .js
import { TaskService } from './services/TaskService';
import { getDatabase } from './db/database';
import fs from 'fs';
import path from 'path';

const app = express();

// Middleware para logging de requisições
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Middleware de segurança e CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware para parsing JSON com limite de tamanho
app.use(express.json({ limit: '1mb' }));

// Logging de erros no middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`Erro ao processar requisição ${req.method} ${req.url}:`, err);
  res.status(500).json({ error: 'Internal server error' });
});

// Registrar rotas
app.use('/api/tasks', taskRouter);
app.use('/api/health', healthRouter); // Novo endpoint de health check

// Inicializar o banco de dados e o agendador
(async () => {
  try {
    console.log('Iniciando conexão com o banco de dados...');
    const db = await getDatabase();
    console.log('Banco de dados conectado, tabelas verificadas');
    
    // Iniciar o scheduler para tarefas pendentes
    const taskService = new TaskService(db);
    
    // Verificar e recuperar de falhas anteriores
    const logDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Iniciar o serviço periodicamente para verificar tarefas agendadas
    await taskService.startScheduler();
    
    // Salvar estado a cada hora para permitir recuperação
    setInterval(async () => {
      await taskService.saveState();
    }, 60 * 60 * 1000);
    
    // Iniciar o servidor HTTP
    const PORT = 3003;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
    
    // Gerenciamento de desligamento gracioso
    const shutdownGracefully = async () => {
      console.log('Recebido sinal de desligamento, encerrando servidor graciosamente...');
      
      try {
        // Salvar estado antes de desligar
        await taskService.saveState();
        console.log('Estado salvo com sucesso');
        
        // Encerrar processo
        process.exit(0);
      } catch (error) {
        console.error('Erro ao desligar servidor:', error);
        process.exit(1);
      }
    };
    
    // Registrar handlers para sinais de desligamento
    process.on('SIGTERM', shutdownGracefully);
    process.on('SIGINT', shutdownGracefully);
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();