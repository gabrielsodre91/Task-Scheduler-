export interface Task {
  id?: number;
  title: string;
  description?: string;
  type: 'one-time' | 'recurring';
  scheduledTime?: Date;     // Para tarefas únicas
  cronExpression?: string;  // Para tarefas recorrentes
  status: 'pending' | 'executed' | 'failed';
  lastExecutionTime?: Date;
  nextExecutionTime?: Date;
  createdAt: Date;
  updatedAt: Date;
} 