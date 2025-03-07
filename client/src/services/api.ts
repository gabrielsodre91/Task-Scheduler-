import axios from 'axios';
import { Task, TaskFormData } from '../types/Task';

const API_URL = 'http://localhost:3003/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Transformar datas de string para objeto Date
const transformDates = (task: any): Task => {
  return {
    ...task,
    scheduledTime: task.scheduledTime ? new Date(task.scheduledTime) : undefined,
    lastExecutionTime: task.lastExecutionTime ? new Date(task.lastExecutionTime) : undefined,
    nextExecutionTime: task.nextExecutionTime ? new Date(task.nextExecutionTime) : undefined,
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt),
  };
};

export const getTasks = async (): Promise<Task[]> => {
  const response = await api.get('/tasks');
  return response.data.map(transformDates);
};

export const getExecutedTasks = async (): Promise<Task[]> => {
  console.log('Calling API to fetch executed tasks');
  try {
    console.log('Request URL:', `${API_URL}/tasks/executed`);
    const response = await api.get('/tasks/executed');
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    console.log('API response for executed tasks:', response.data);
    
    if (!response.data || !Array.isArray(response.data)) {
      console.error('Response is not an array:', response.data);
      return [];
    }
    
    const transformedTasks = response.data.map(transformDates);
    console.log('Transformed executed tasks:', transformedTasks);
    return transformedTasks;
  } catch (error) {
    console.error('Error fetching executed tasks:', error);
    return [];
  }
};

export const getTask = async (id: number): Promise<Task> => {
  const response = await api.get(`/tasks/${id}`);
  return transformDates(response.data);
};

export const createTask = async (task: TaskFormData): Promise<Task> => {
  try {
    console.log("Sending to API:", JSON.stringify(task));
    const response = await api.post('/tasks', task);
    console.log("Response received:", response.data);
    return transformDates(response.data);
  } catch (error) {
    console.error("Error in API createTask:", error);
    if (axios.isAxiosError(error) && error.response) {
      console.error("Error details:", error.response.data);
    }
    throw error;
  }
};

export const updateTask = async (id: number, task: Partial<Task>): Promise<Task> => {
  const response = await api.put(`/tasks/${id}`, task);
  return transformDates(response.data);
};

export const deleteTask = async (id: number): Promise<void> => {
  await api.delete(`/tasks/${id}`);
};