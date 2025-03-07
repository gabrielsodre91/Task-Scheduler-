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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const database_1 = require("./db/database");
const TaskService_1 = require("./services/TaskService");
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        const app = (0, express_1.default)();
        const port = process.env.PORT || 3002;
        app.use((0, cors_1.default)());
        app.use(express_1.default.json());
        const db = yield (0, database_1.getDatabase)();
        const taskService = new TaskService_1.TaskService(db);
        // Iniciar o agendador
        yield taskService.startScheduler();
        // Rotas da API
        app.get('/api/tasks', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const tasks = yield taskService.getAllTasks();
                res.json(tasks);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        }));
        app.get('/api/tasks/executed', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const tasks = yield taskService.getExecutedTasks();
                res.json(tasks);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        }));
        app.get('/api/tasks/:id', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const task = yield taskService.getTaskById(parseInt(req.params.id));
                if (!task) {
                    return res.status(404).json({ error: 'Task not found' });
                }
                res.json(task);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        }));
        app.post('/api/tasks', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const task = yield taskService.createTask(req.body);
                res.status(201).json(task);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        }));
        app.put('/api/tasks/:id', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const task = yield taskService.updateTask(parseInt(req.params.id), req.body);
                if (!task) {
                    return res.status(404).json({ error: 'Task not found' });
                }
                res.json(task);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        }));
        app.delete('/api/tasks/:id', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const success = yield taskService.deleteTask(parseInt(req.params.id));
                if (!success) {
                    return res.status(404).json({ error: 'Task not found' });
                }
                res.status(204).send();
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        }));
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    });
}
startServer().catch(console.error);
