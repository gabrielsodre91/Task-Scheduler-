import cron from 'node-cron';

export function calculateNextCronExecution(cronExpression: string): Date {
  if (!cron.validate(cronExpression)) {
    throw new Error('Invalid cron expression');
  }
  
  const interval = cron.schedule(cronExpression, () => {});
  interval.stop();
  
  // Obter a próxima data de execução
  const now = new Date();
  const parts = cronExpression.split(' ');
  
  // Implementação simplificada para o protótipo
  // Em um sistema real, usaríamos uma biblioteca mais robusta
  
  // Adicionar pelo menos 1 minuto para garantir que seja no futuro
  const nextDate = new Date(now.getTime() + 60000);
  
  return nextDate;
} 