import { Router } from 'express';
import * as TaskController from '../controllers/TaskController';

const router = Router();

// Rotas para tarefas
router.get('/', TaskController.getAllTasks);
router.get('/executed', TaskController.getExecutedTasks); // Certifique-se de que esta rota está registrada
router.get('/:id', TaskController.getTaskById);
router.post('/', TaskController.createTask);
router.put('/:id', TaskController.updateTask);
router.delete('/:id', TaskController.deleteTask);

export default router;