export interface Task {
  id?: number;
  title: string;
  description?: string;
  type: 'one-time' | 'recurring';
  scheduledTime?: Date;
  cronExpression?: string;
  status: 'pending' | 'executed' | 'failed';
  lastExecutionTime?: Date;
  nextExecutionTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskFormData {
  title: string;
  description?: string;
  type: 'one-time' | 'recurring';
  scheduledTime?: Date;
  cronExpression?: string;
} 