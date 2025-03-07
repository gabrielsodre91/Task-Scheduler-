import { Request, Response } from 'express';
import { TaskService } from '../services/TaskService';
import { getDatabase } from '../db/database';

export const getAllTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDatabase();
    const taskService = new TaskService(db);
    const tasks = await taskService.getAllTasks();
    res.json(tasks);
  } catch (error) {
    console.error('Error getting tasks:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
};

export const getExecutedTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('API - Recebida solicitação para buscar tarefas executadas');
    const db = await getDatabase();

    // Verificar diretamente sem chamar o serviço para diagnóstico
    try {
      const executedTasks = await db.all('SELECT * FROM tasks WHERE status = ? OR status = ?', 
                                        'executed', 'completed');
      
      console.log('Tarefas executadas encontradas diretamente:', executedTasks.length);
      
      // Transformar datas
      const processedTasks = executedTasks.map(task => ({
        ...task,
        scheduledTime: task.scheduledTime ? new Date(task.scheduledTime) : undefined,
        lastExecutionTime: task.lastExecutionTime ? new Date(task.lastExecutionTime) : undefined,
        nextExecutionTime: task.nextExecutionTime ? new Date(task.nextExecutionTime) : undefined,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt)
      }));
      
      res.json(processedTasks);
    } catch (dbError) {
      console.error("Erro ao buscar tarefas executadas diretamente:", dbError);
      res.status(500).json({ error: "Database error" });
    }
  } catch (error) {
    console.error('Error getting executed tasks:', error);
    res.status(500).json({ error: 'Failed to get executed tasks' });
  }
};

export const getTaskById = async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDatabase();
    const taskService = new TaskService(db);
    const task = await taskService.getTaskById(Number(req.params.id));
    
    if (task) {
      res.json(task);
    } else {
      res.status(404).json({ error: 'Task not found' });
    }
  } catch (error) {
    console.error('Error getting task by id:', error);
    res.status(500).json({ error: 'Failed to get task' });
  }
};

export const createTask = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Recebendo requisição para criar task:', req.body);
    const db = await getDatabase();
    const taskService = new TaskService(db);
    const task = await taskService.createTask(req.body);
    console.log('Task criada com sucesso:', task);
    res.status(201).json(task);
  } catch (error) {
    console.error('Erro ao criar task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
};

export const updateTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDatabase();
    const taskService = new TaskService(db);
    const task = await taskService.updateTask(Number(req.params.id), req.body);
    
    if (task) {
      res.json(task);
    } else {
      res.status(404).json({ error: 'Task not found' });
    }
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDatabase();
    const taskService = new TaskService(db);
    const success = await taskService.deleteTask(Number(req.params.id));
    
    if (success) {
      res.status(204).end();
    } else {
      res.status(404).json({ error: 'Task not found' });
    }
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};
