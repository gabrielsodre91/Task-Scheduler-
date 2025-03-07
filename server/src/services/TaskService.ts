import { Database } from 'sqlite';
import { Task } from '../models/Task';
import cron from 'node-cron';
import { formatISO, parseISO, addSeconds, isBefore } from 'date-fns';
import { getDatabase } from '../db/database';
import path from 'path';
import fs from 'fs';

// Função para calcular a próxima execução de uma expressão cron
function calculateNextExecution(cronExpression: string): Date {
  try {
    // Para este exemplo simplificado, vamos apenas adicionar 1 minuto à hora atual
    // Em um ambiente de produção, você usaria uma biblioteca como 'cron-parser'
    const nextDate = new Date();
    nextDate.setMinutes(nextDate.getMinutes() + 1);
    return nextDate;
  } catch (error) {
    console.error('Erro ao calcular próxima execução:', error);
    throw new Error('Invalid cron expression');
  }
}

// Reduzir a frequência de verificação
const CHECK_INTERVAL = 60000; // 1 minuto em vez de poucos segundos

export class TaskService {
  private db: Database;
  private scheduledTasks: Map<number, NodeJS.Timeout> = new Map();
  
  constructor(db: Database) {
    this.db = db;
  }
  
  async createTask(task: Omit<Task, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    try {
      console.log('Iniciando criação da task:', task);
      const now = new Date();
      
      let nextExecutionTime: Date | undefined;
      if (task.type === 'one-time' && task.scheduledTime) {
        nextExecutionTime = new Date(task.scheduledTime);
        console.log('Next execution time for one-time task:', nextExecutionTime);
      } else if (task.type === 'recurring' && task.cronExpression) {
        nextExecutionTime = calculateNextExecution(task.cronExpression);
        console.log('Next execution time for recurring task:', nextExecutionTime);
      }
      
      // Forçar conversão para data antes de criar o objeto Task
      const scheduledTimeDate = task.scheduledTime ? new Date(task.scheduledTime) : undefined;
      
      const newTask: Task = {
        ...task,
        scheduledTime: scheduledTimeDate,
        status: 'pending',
        nextExecutionTime,
        createdAt: now,
        updatedAt: now
      };
      
      console.log('Task preparada para inserção:', JSON.stringify(newTask, null, 2));
      
      try {
        // Verificar se o banco está conectado
        console.log('Verificando conexão com o banco...');
        await this.db.get('SELECT 1');
        console.log('Conexão com o banco OK');

        // Converter explicitamente para ISO string
        const scheduledTimeISO = scheduledTimeDate ? scheduledTimeDate.toISOString() : null;
        const nextExecutionTimeISO = nextExecutionTime ? nextExecutionTime.toISOString() : null;
        const createdAtISO = now.toISOString();
        const updatedAtISO = now.toISOString();
        
        const result = await this.db.run(
          `INSERT INTO tasks (
            title, 
            description, 
            type, 
            scheduledTime, 
            cronExpression, 
            status, 
            nextExecutionTime, 
            createdAt, 
            updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newTask.title,
            newTask.description || null,
            newTask.type,
            scheduledTimeISO,
            newTask.cronExpression || null,
            newTask.status,
            nextExecutionTimeISO,
            createdAtISO,
            updatedAtISO
          ]
        );
        
        console.log('Resultado da inserção:', result);
        
        const createdTask = { ...newTask, id: result.lastID };
        console.log('Task criada com sucesso:', createdTask);
        
        this.scheduleTask(createdTask);
        
        return createdTask;
      } catch (dbError) {
        console.error('Erro SQL:', dbError);
        throw new Error(`Erro ao inserir no banco: ${dbError instanceof Error ? dbError.message : 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro geral:', error);
      throw error;
    }
  }
  
  async getAllTasks(): Promise<Task[]> {
    const tasks = await this.db.all<Task[]>('SELECT * FROM tasks');
    return tasks.map(task => ({
      ...task,
      scheduledTime: task.scheduledTime ? new Date(task.scheduledTime) : undefined,
      lastExecutionTime: task.lastExecutionTime ? new Date(task.lastExecutionTime) : undefined,
      nextExecutionTime: task.nextExecutionTime ? new Date(task.nextExecutionTime) : undefined,
      createdAt: new Date(task.createdAt),
      updatedAt: new Date(task.updatedAt)
    }));
  }
  
  async getTaskById(id: number): Promise<Task | null> {
    const task = await this.db.get<Task>('SELECT * FROM tasks WHERE id = ?', id);
    if (!task) return null;
    
    return {
      ...task,
      scheduledTime: task.scheduledTime ? new Date(task.scheduledTime) : undefined,
      lastExecutionTime: task.lastExecutionTime ? new Date(task.lastExecutionTime) : undefined,
      nextExecutionTime: task.nextExecutionTime ? new Date(task.nextExecutionTime) : undefined,
      createdAt: new Date(task.createdAt),
      updatedAt: new Date(task.updatedAt)
    };
  }
  
  async updateTask(id: number, taskUpdate: Partial<Task>): Promise<Task | null> {
    const task = await this.getTaskById(id);
    if (!task) return null;
    
    const updatedTask: Task = {
      ...task,
      ...taskUpdate,
      updatedAt: new Date()
    };
    
    // Recalcular o próximo tempo de execução se necessário
    if (taskUpdate.cronExpression && updatedTask.type === 'recurring') {
      updatedTask.nextExecutionTime = calculateNextExecution(taskUpdate.cronExpression);
    } else if (taskUpdate.scheduledTime && updatedTask.type === 'one-time') {
      updatedTask.nextExecutionTime = new Date(taskUpdate.scheduledTime);
    }
    
    const fields = Object.keys(taskUpdate).concat('updatedAt');
    const placeholders = fields.map(() => '?').join(', ');
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    await this.db.run(
      `UPDATE tasks SET ${setClause} WHERE id = ?`,
      [...fields.map(field => {
        const value = updatedTask[field as keyof Task];
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }), id]
    );
    
    // Reescalonar a tarefa
    if (this.scheduledTasks.has(id)) {
      clearTimeout(this.scheduledTasks.get(id));
      this.scheduledTasks.delete(id);
    }
    this.scheduleTask(updatedTask);
    
    return updatedTask;
  }
  
  async deleteTask(id: number): Promise<boolean> {
    const result = await this.db.run('DELETE FROM tasks WHERE id = ?', id);
    
    if (this.scheduledTasks.has(id)) {
      clearTimeout(this.scheduledTasks.get(id));
      this.scheduledTasks.delete(id);
    }
    
    // Corrigir o erro verificando se changes existe e tem um valor
    return result.changes !== undefined && result.changes > 0;
  }
  
  async getExecutedTasks(): Promise<Task[]> {
    console.log('Buscando tarefas executadas...');
    
    try {
      // Primeiro, vamos verificar todas as tarefas para depuração
      const allTasks = await this.db.all<Task[]>('SELECT id, title, status FROM tasks');
      console.log('DEBUG - Todas as tarefas:', 
        allTasks.map(t => `${t.id}: ${t.title} (${t.status})`).join(', ')
      );
      
      // Buscar tarefas com status 'executed'
      const executedTasksRaw = await this.db.all('SELECT * FROM tasks WHERE status = ?', 'executed');
      console.log('DEBUG - Tarefas com status executed:', executedTasksRaw.length);
      
      // Buscar tarefas com status 'executed'
      const tasks = await this.db.all<Task[]>('SELECT * FROM tasks WHERE status = ?', 'executed');
      
      console.log(`${tasks.length} tarefas executadas encontradas`);
      
      // Converter os timestamps das datas para objetos Date
      const processedTasks = tasks.map(task => ({
        ...task,
        scheduledTime: task.scheduledTime ? new Date(task.scheduledTime) : undefined,
        lastExecutionTime: task.lastExecutionTime ? new Date(task.lastExecutionTime) : undefined,
        nextExecutionTime: task.nextExecutionTime ? new Date(task.nextExecutionTime) : undefined,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt)
      }));
      
      return processedTasks;
    } catch (error) {
      console.error('Erro ao buscar tarefas executadas:', error);
      return [];
    }
  }
  
  private scheduleTask(task: Task): void {
    if (!task.id || !task.nextExecutionTime) return;
    
    const now = new Date();
    const delay = Math.max(0, task.nextExecutionTime.getTime() - now.getTime());
    
    // Agendar a execução da tarefa
    const timeoutId = setTimeout(async () => {
      await this.executeTask(task.id!);
    }, delay);
    
    this.scheduledTasks.set(task.id, timeoutId);
  }
  
  private async executeTask(taskId: number): Promise<void> {
    try {
      console.log(`Iniciando execução da tarefa ${taskId}`);
      
      // Verificar se a tarefa existe
      const task = await this.getTaskById(taskId);
      if (!task) {
        console.error(`Tarefa ${taskId} não encontrada.`);
        return;
      }
      
      // Registrar execução
      const now = new Date();
      
      // Atualizar para "executed"
      try {
        console.log(`Atualizando status da tarefa ${taskId} para 'executed'`);
        await this.db.run(`
          UPDATE tasks
          SET status = 'executed', lastExecutionTime = ?, updatedAt = ?
          WHERE id = ?
        `, now.toISOString(), now.toISOString(), taskId);
        
        console.log(`Tarefa ${taskId} executada com sucesso. Verificando DB...`);
        
        // Verificar se a atualização foi efetivamente aplicada
        const taskAfter = await this.db.get('SELECT * FROM tasks WHERE id = ?', taskId);
        console.log(`Status atual da tarefa ${taskId} no banco:`, taskAfter?.status);
        
        // Para tarefas recorrentes, agendar próxima execução depois de um tempo
        if (task.type === 'recurring' && task.cronExpression) {
          // Atraso para que a tarefa fique visível na lista de executadas por alguns segundos
          console.log(`Agendando reagendamento da tarefa recorrente ${taskId} para daqui 45 segundos`);
          setTimeout(async () => {
            console.log(`Reagendando tarefa recorrente ${taskId} após visualização na lista de executadas`);
            const nextExecution = calculateNextExecution(task.cronExpression!);
            
            // Verificar primeiro se a tarefa ainda tem status executed (pode ter sido alterada manualmente)
            const currentTask = await this.db.get('SELECT status FROM tasks WHERE id = ?', taskId);
            if (currentTask?.status !== 'executed') {
              console.log(`Tarefa ${taskId} não está mais como executed, está como ${currentTask?.status}. Pulando reagendamento.`);
              return;
            }
            
            // Reagendar a tarefa
            await this.db.run(`
              UPDATE tasks
              SET status = 'pending', nextExecutionTime = ?, updatedAt = ?
              WHERE id = ?
            `, nextExecution.toISOString(), new Date().toISOString(), taskId);
            
            // Verificar se a tarefa foi atualizada para 'pending'
            const updatedTaskStatus = await this.db.get('SELECT * FROM tasks WHERE id = ?', taskId);
            console.log(`Tarefa ${taskId} reagendada, novo status:`, updatedTaskStatus?.status);
            
            if (updatedTaskStatus && updatedTaskStatus.status === 'pending') {
              const updatedTask = await this.getTaskById(taskId);
              if (updatedTask) {
                this.scheduleTask(updatedTask);
                console.log(`Próxima execução da tarefa ${taskId} agendada para ${updatedTask.nextExecutionTime}`);
              }
            }
          }, 45000); // Aumentar para 45 segundos para facilitar a visualização
        }
      } catch (dbError) {
        console.error(`Erro ao atualizar status da tarefa ${taskId}:`, dbError);
      }
    } catch (error) {
      console.error(`Erro na execução da tarefa ${taskId}:`, error);
    }
  }

  async checkAndExecuteTasks(): Promise<void> {
    try {
      console.log("Verificando tarefas agendadas...");
      const tasks = await this.db.all<Task[]>('SELECT * FROM tasks WHERE status = ?', 'pending');
      
      if (tasks.length === 0) {
        console.log("Nenhuma tarefa pendente encontrada");
        return;
      }
      
      console.log(`${tasks.length} tarefas pendentes encontradas`);
      
      // Processamento de forma mais simples e segura
      const now = new Date();
      
      for (const task of tasks) {
        try {
          // Verificar apenas tarefas com agendamento no passado
          if (task.nextExecutionTime) {
            const nextExecTime = new Date(task.nextExecutionTime);
            if (nextExecTime <= now) {
              console.log(`Executando tarefa ${task.id} (${task.title}) [${task.type}]`);
              await this.executeTask(task.id!);
            }
          }
        } catch (taskError) {
          console.error(`Erro ao processar tarefa ${task.id}:`, taskError);
        }
      }
    } catch (error) {
      console.error("Erro ao verificar tarefas:", error);
    }
  }
  
  // O método deve ser explicitamente público 
  public async startScheduler(): Promise<void> {
    const pendingTasks = await this.db.all<Task[]>('SELECT * FROM tasks WHERE status = ?', 'pending');
    
    for (const task of pendingTasks) {
      if (task.nextExecutionTime) {
        task.nextExecutionTime = new Date(task.nextExecutionTime);
        this.scheduleTask(task);
      }
    }
    
    console.log(`Scheduler started with ${pendingTasks.length} pending tasks`);
    setInterval(() => {
      this.checkScheduledTasks();
    }, CHECK_INTERVAL);
  }

  // Adicionar um método para importação de tarefas de backup
  public async importTasksFromBackup(tasks: Task[]): Promise<number> {
    let importedCount = 0;
    
    try {
      for (const task of tasks) {
        // Verificar se a tarefa já existe pelo ID
        const existingTask = await this.db.get('SELECT id FROM tasks WHERE id = ?', task.id);
        
        if (!existingTask) {
          // Inserir a tarefa
          await this.db.run(`
            INSERT INTO tasks (
              id, title, description, type, scheduledTime, cronExpression, 
              status, lastExecutionTime, nextExecutionTime, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            task.id,
            task.title,
            task.description,
            task.type,
            task.scheduledTime ? new Date(task.scheduledTime).toISOString() : null,
            task.cronExpression || null,
            task.status,
            task.lastExecutionTime ? new Date(task.lastExecutionTime).toISOString() : null,
            task.nextExecutionTime ? new Date(task.nextExecutionTime).toISOString() : null,
            new Date(task.createdAt).toISOString(),
            new Date(task.updatedAt).toISOString()
          ]);
          
          importedCount++;
        }
      }
      
      console.log(`Importadas ${importedCount} tarefas do backup`);
      return importedCount;
    } catch (error) {
      console.error('Erro ao importar tarefas do backup:', error);
      throw error;
    }
  }

  // Adicionar um método para salvar o estado
  public async saveState(): Promise<string> {
    try {
      const tasks = await this.getAllTasks();
      const stateData = JSON.stringify(tasks);
      
      const stateDir = path.join(__dirname, '..', '..', 'data', 'states');
      if (!fs.existsSync(stateDir)) {
        fs.mkdirSync(stateDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const statePath = path.join(stateDir, `state-${timestamp}.json`);
      
      fs.writeFileSync(statePath, stateData);
      console.log(`Estado salvo: ${statePath}`);
      
      return statePath;
    } catch (error) {
      console.error('Erro ao salvar estado:', error);
      throw error;
    }
  }

  // Adicionar função de recuperação de falha durante processamento de tarefa
  private async executeTaskWithRetry(taskId: number, maxRetries = 3): Promise<boolean> {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        await this.executeTask(taskId);
        return true; // Sucesso
      } catch (err) {
        retries++;
        console.error(`Falha ao executar tarefa ${taskId}. Tentativa ${retries}/${maxRetries}:`, err);
        
        if (retries < maxRetries) {
          // Backoff exponencial: espera 1s, 2s, 4s, etc. antes de tentar novamente
          const delay = Math.pow(2, retries - 1) * 1000;
          console.log(`Aguardando ${delay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Registrar falha permanente
          await this.db.run(`
            UPDATE tasks
            SET status = 'failed', updatedAt = ?
            WHERE id = ?
          `, new Date().toISOString(), taskId);
          
          // Registrar log de execução com falha
          await this.db.run(`
            INSERT INTO task_executions (taskId, executionTime, status, error)
            VALUES (?, ?, ?, ?)
          `, [
            taskId,
            new Date().toISOString(),
            'failed',
            err instanceof Error ? err.message : String(err)
          ]);
        }
      }
    }
    
    return false; // Todas as tentativas falharam
  }

  private async checkScheduledTasks(): Promise<void> {
    try {
      console.log("Verificando tarefas agendadas...");
      const tasks = await this.db.all<Task[]>('SELECT * FROM tasks WHERE status = ?', 'pending');
      
      if (tasks.length === 0) {
        console.log("Nenhuma tarefa pendente encontrada");
        return;
      }
      
      console.log(`${tasks.length} tarefas pendentes encontradas`);
      
      // Processamento de forma mais simples e segura
      const now = new Date();
      
      for (const task of tasks) {
        try {
          // Verificar apenas tarefas com agendamento no passado
          if (task.nextExecutionTime) {
            const nextExecTime = new Date(task.nextExecutionTime);
            if (nextExecTime <= now) {
              console.log(`Executando tarefa ${task.id} (${task.title}) [${task.type}]`);
              await this.executeTask(task.id!);
            }
          }
        } catch (taskError) {
          console.error(`Erro ao processar tarefa ${task.id}:`, taskError);
        }
      }
    } catch (error) {
      console.error("Erro ao verificar tarefas:", error);
    }
  }
}

// Iniciar a verificação periódica das tarefas
setInterval(async () => {
  const taskService = new TaskService(await getDatabase());
  await taskService.checkAndExecuteTasks();
}, 10000); // Verificar a cada 10 segundos