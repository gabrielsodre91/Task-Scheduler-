import React from 'react';
import { Task } from '../types/Task';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface TaskItemProps {
  task: Task;
  onDelete: (id: number | undefined) => void;
  onEdit?: (task: Task) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onDelete, onEdit }) => {
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'MM/dd/yyyy HH:mm', { locale: enUS });
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  };
  
  return (
    <tr>
      <td>
        <div className="has-text-weight-medium">{task.title}</div>
        {task.description && (
          <div className="has-text-grey is-size-7">{task.description}</div>
        )}
      </td>
      <td>
        <span className={`tag ${task.type === 'one-time' ? 'is-info' : 'is-warning'}`}>
          {task.type === 'one-time' ? 'One-time' : 'Recurring'}
        </span>
      </td>
      <td>
        <span className={`tag ${task.status === 'pending' ? 'is-warning' : 'is-success'}`}>
          {task.status === 'pending' ? 'Pending' : 'Executed'}
        </span>
        <br />
        <small className="has-text-grey">
          {task.type === 'one-time' 
            ? formatDate(task.scheduledTime)
            : task.cronExpression
          }
        </small>
      </td>
      <td>
        {task.lastExecutionTime ? (
          <span className="has-text-grey">
            {formatDate(task.lastExecutionTime)}
          </span>
        ) : (
          <span className="has-text-grey-light">-</span>
        )}
      </td>
      <td>
        <div className="buttons are-small">
          {task.status === 'pending' && onEdit && (
            <button 
              className="button is-info is-light"
              onClick={() => onEdit(task)}
              title="Edit task"
            >
              <span className="icon">
                <i className="fas fa-edit"></i>
              </span>
            </button>
          )}
          
          <button 
            className="button is-danger is-light"
            onClick={() => onDelete(task.id)}
            title="Delete task"
          >
            <span className="icon">
              <i className="fas fa-trash"></i>
            </span>
          </button>
        </div>
      </td>
    </tr>
  );
};

export default TaskItem;
