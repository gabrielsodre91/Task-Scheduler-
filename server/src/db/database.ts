import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

declare const __dirname: string;

export async function getDatabase() {
  console.log('Iniciando conexão com o banco de dados...');
  
  const dbPath = path.resolve(__dirname, '../database.sqlite');
  console.log('Caminho do banco:', dbPath);
  
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  console.log('Banco de dados conectado, criando tabela se não existir...');
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      scheduledTime TEXT,
      cronExpression TEXT,
      status TEXT NOT NULL,
      lastExecutionTime TEXT,
      nextExecutionTime TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);
  
  console.log('Tabela tasks verificada/criada com sucesso');
  
  return db;
} 