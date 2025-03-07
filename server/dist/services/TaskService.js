"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskService = void 0;
const cronUtils_1 = require("../utils/cronUtils");
class TaskService {
    constructor(db) {
        this.scheduledTasks = new Map();
        this.db = db;
    }
    createTask(task) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            let nextExecutionTime;
            if (task.type === 'one-time' && task.scheduledTime) {
                nextExecutionTime = new Date(task.scheduledTime);
            }
            else if (task.type === 'recurring' && task.cronExpression) {
                nextExecutionTime = (0, cronUtils_1.calculateNextCronExecution)(task.cronExpression);
            }
            const newTask = Object.assign(Object.assign({}, task), { status: 'pending', nextExecutionTime, createdAt: now, updatedAt: now });
            const result = yield this.db.run(`INSERT INTO tasks (title, description, type, scheduledTime, cronExpression, status, nextExecutionTime, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                newTask.title,
                newTask.description || null,
                newTask.type,
                newTask.scheduledTime ? newTask.scheduledTime.toISOString() : null,
                newTask.cronExpression || null,
                newTask.status,
                newTask.nextExecutionTime ? newTask.nextExecutionTime.toISOString() : null,
                newTask.createdAt.toISOString(),
                newTask.updatedAt.toISOString()
            ]);
            const createdTask = Object.assign(Object.assign({}, newTask), { id: result.lastID });
            this.scheduleTask(createdTask);
            return createdTask;
        });
    }
    getAllTasks() {
        return __awaiter(this, void 0, void 0, function* () {
            const tasks = yield this.db.all('SELECT * FROM tasks');
            return tasks.map(task => (Object.assign(Object.assign({}, task), { scheduledTime: task.scheduledTime ? new Date(task.scheduledTime) : undefined, lastExecutionTime: task.lastExecutionTime ? new Date(task.lastExecutionTime) : undefined, nextExecutionTime: task.nextExecutionTime ? new Date(task.nextExecutionTime) : undefined, createdAt: new Date(task.createdAt), updatedAt: new Date(task.updatedAt) })));
        });
    }
    getTaskById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const task = yield this.db.get('SELECT * FROM tasks WHERE id = ?', id);
            if (!task)
                return null;
            return Object.assign(Object.assign({}, task), { scheduledTime: task.scheduledTime ? new Date(task.scheduledTime) : undefined, lastExecutionTime: task.lastExecutionTime ? new Date(task.lastExecutionTime) : undefined, nextExecutionTime: task.nextExecutionTime ? new Date(task.nextExecutionTime) : undefined, createdAt: new Date(task.createdAt), updatedAt: new Date(task.updatedAt) });
        });
    }
    updateTask(id, taskUpdate) {
        return __awaiter(this, void 0, void 0, function* () {
            const task = yield this.getTaskById(id);
            if (!task)
                return null;
            const updatedTask = Object.assign(Object.assign(Object.assign({}, task), taskUpdate), { updatedAt: new Date() });
            // Recalcular o próximo tempo de execução se necessário
            if (taskUpdate.cronExpression && updatedTask.type === 'recurring') {
                updatedTask.nextExecutionTime = (0, cronUtils_1.calculateNextCronExecution)(taskUpdate.cronExpression);
            }
            else if (taskUpdate.scheduledTime && updatedTask.type === 'one-time') {
                updatedTask.nextExecutionTime = new Date(taskUpdate.scheduledTime);
            }
            const fields = Object.keys(taskUpdate).concat('updatedAt');
            const placeholders = fields.map(() => '?').join(', ');
            const setClause = fields.map(field => `${field} = ?`).join(', ');
            yield this.db.run(`UPDATE tasks SET ${setClause} WHERE id = ?`, [...fields.map(field => {
                    const value = updatedTask[field];
                    if (value instanceof Date) {
                        return value.toISOString();
                    }
                    return value;
                }), id]);
            // Reescalonar a tarefa
            if (this.scheduledTasks.has(id)) {
                clearTimeout(this.scheduledTasks.get(id));
                this.scheduledTasks.delete(id);
            }
            this.scheduleTask(updatedTask);
            return updatedTask;
        });
    }
    deleteTask(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.db.run('DELETE FROM tasks WHERE id = ?', id);
            if (this.scheduledTasks.has(id)) {
                clearTimeout(this.scheduledTasks.get(id));
                this.scheduledTasks.delete(id);
            }
            // Corrigir o erro verificando se changes existe e tem um valor
            return result.changes !== undefined && result.changes > 0;
        });
    }
    getExecutedTasks() {
        return __awaiter(this, void 0, void 0, function* () {
            const tasks = yield this.db.all('SELECT * FROM tasks WHERE status = ?', 'executed');
            return tasks.map(task => (Object.assign(Object.assign({}, task), { scheduledTime: task.scheduledTime ? new Date(task.scheduledTime) : undefined, lastExecutionTime: task.lastExecutionTime ? new Date(task.lastExecutionTime) : undefined, nextExecutionTime: task.nextExecutionTime ? new Date(task.nextExecutionTime) : undefined, createdAt: new Date(task.createdAt), updatedAt: new Date(task.updatedAt) })));
        });
    }
    scheduleTask(task) {
        if (!task.id || !task.nextExecutionTime)
            return;
        const now = new Date();
        const delay = Math.max(0, task.nextExecutionTime.getTime() - now.getTime());
        // Agendar a execução da tarefa
        const timeoutId = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            yield this.executeTask(task.id);
        }), delay);
        this.scheduledTasks.set(task.id, timeoutId);
    }
    executeTask(taskId) {
        return __awaiter(this, void 0, void 0, function* () {
            const task = yield this.getTaskById(taskId);
            if (!task)
                return;
            const now = new Date();
            // Simular a execução da tarefa
            console.log(`Executing task: ${task.title} at ${now.toISOString()}`);
            // Atualizar o status da tarefa
            const updates = {
                status: 'executed',
                lastExecutionTime: now,
                updatedAt: now
            };
            // Para tarefas recorrentes, calcular o próximo tempo de execução
            if (task.type === 'recurring' && task.cronExpression) {
                updates.status = 'pending';
                updates.nextExecutionTime = (0, cronUtils_1.calculateNextCronExecution)(task.cronExpression);
            }
            yield this.updateTask(taskId, updates);
            // Se for recorrente, agendar a próxima execução
            if (task.type === 'recurring' && updates.nextExecutionTime) {
                const updatedTask = yield this.getTaskById(taskId);
                if (updatedTask) {
                    this.scheduleTask(updatedTask);
                }
            }
        });
    }
    // Iniciar o agendador para todas as tarefas pendentes
    startScheduler() {
        return __awaiter(this, void 0, void 0, function* () {
            const pendingTasks = yield this.db.all('SELECT * FROM tasks WHERE status = ?', 'pending');
            for (const task of pendingTasks) {
                if (task.nextExecutionTime) {
                    task.nextExecutionTime = new Date(task.nextExecutionTime);
                    this.scheduleTask(task);
                }
            }
            console.log(`Scheduler started with ${pendingTasks.length} pending tasks`);
        });
    }
}
exports.TaskService = TaskService;
