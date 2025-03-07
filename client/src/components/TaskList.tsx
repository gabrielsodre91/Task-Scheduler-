import React from 'react';
import { Task } from '../types/Task';
import { deleteTask } from '../services/api';
import TaskItem from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  title: string;
  onTaskDeleted: () => void;
  onTaskEdit?: (task: Task) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, title, onTaskDeleted, onTaskEdit }) => {
  const handleDelete = async (id: number | undefined) => {
    if (!id) return;
    
    if (!window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
      return;
    }
    
    try {
      await deleteTask(id);
      onTaskDeleted();
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Erro ao excluir a tarefa. Por favor, tente novamente.');
    }
  };
  
  return (
    <div className="box">
      <h3 className="title is-5 mb-4">
        <span className="icon-text">
          <span className="icon">
            <i className={`fas ${title.includes('Pendentes') ? 'fa-clock' : 'fa-check-circle'}`}></i>
          </span>
          <span>{title}</span>
        </span>
      </h3>

      {tasks.length === 0 ? (
        <div className="has-text-centered has-text-grey-light py-6">
          <span className="icon is-large">
            <i className="fas fa-inbox fa-2x"></i>
          </span>
          <p className="mt-2">Nenhuma tarefa encontrada</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table is-fullwidth is-hoverable">
            <thead>
              <tr>
                <th>Título</th>
                <th>Tipo</th>
                <th>Status/Tempo</th>
                <th>Última Execução</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  onDelete={handleDelete}
                  onEdit={onTaskEdit}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TaskList;