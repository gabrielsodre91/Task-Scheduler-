"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateNextCronExecution = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
function calculateNextCronExecution(cronExpression) {
    if (!node_cron_1.default.validate(cronExpression)) {
        throw new Error('Invalid cron expression');
    }
    const interval = node_cron_1.default.schedule(cronExpression, () => { });
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
exports.calculateNextCronExecution = calculateNextCronExecution;
