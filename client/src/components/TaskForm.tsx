import React, { useState } from 'react';
import { Task, TaskFormData } from '../types/Task';
import { createTask } from '../services/api';

interface TaskFormProps {
  onTaskCreated: (task?: Task) => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ onTaskCreated }) => {
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    type: 'one-time',
    scheduledTime: undefined,
    cronExpression: '',
  });
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: TaskFormData) => ({ ...prev, [name]: value }));
  };
  
  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData((prev: TaskFormData) => ({ ...prev, scheduledTime: value ? new Date(value) : undefined }));
  };
  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      if (!formData.title) {
        setError('Title is required');
        return;
      }
      
      if (formData.type === 'one-time' && !formData.scheduledTime) {
        setError('Scheduled time is required for one-time tasks');
        return;
      }
      
      if (formData.type === 'recurring' && !formData.cronExpression) {
        setError('Cron expression is required for recurring tasks');
        return;
      }
      
      let processedData = { ...formData };
      const createdTask = await createTask(processedData);
      
      onTaskCreated(createdTask);
      
      // Clear form
      setFormData({
        title: '',
        description: '',
        type: 'one-time',
        scheduledTime: new Date(),
        cronExpression: '',
      });
    } catch (error) {
      console.error("Error creating task:", error);
      setError('Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="box">
      <h2 className="title is-4">
        <span className="icon-text">
          <span className="icon">
            <i className="fas fa-calendar-plus"></i>
          </span>
          <span>New Task</span>
        </span>
      </h2>

      {error && (
        <div className="notification is-danger is-light">
          <button className="delete" onClick={() => setError(null)}></button>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="label">Title</label>
          <div className="control has-icons-left">
            <input
              className="input"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter task title"
            />
            <span className="icon is-small is-left">
              <i className="fas fa-tasks"></i>
            </span>
          </div>
        </div>

        <div className="field">
          <label className="label">Description</label>
          <div className="control">
            <textarea
              className="textarea"
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              placeholder="Describe the task (optional)"
            />
          </div>
        </div>

        <div className="field">
          <label className="label">Task Type</label>
          <div className="control">
            <div className="select is-fullwidth">
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
              >
                <option value="one-time">One-time</option>
                <option value="recurring">Recurring</option>
              </select>
            </div>
          </div>
        </div>

        {formData.type === 'one-time' && (
          <div className="field">
            <label className="label">Date and Time</label>
            <div className="control has-icons-left">
              <input
                className="input"
                type="datetime-local"
                name="scheduledTime"
                value={formData.scheduledTime ? new Date(formData.scheduledTime.getTime() - formData.scheduledTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                onChange={handleDateTimeChange}
              />
              <span className="icon is-small is-left">
                <i className="fas fa-clock"></i>
              </span>
            </div>
          </div>
        )}

        {formData.type === 'recurring' && (
          <div className="field">
            <label className="label">Cron Expression</label>
            <div className="control has-icons-left">
              <input
                className="input"
                type="text"
                name="cronExpression"
                value={formData.cronExpression || ''}
                onChange={handleChange}
                placeholder="* * * * *"
              />
              <span className="icon is-small is-left">
                <i className="fas fa-sync"></i>
              </span>
            </div>
            <p className="help">Format: minute hour day-of-month month day-of-week</p>
          </div>
        )}

        <div className="field">
          <div className="control">
            <button 
              className={`button is-primary ${loading ? 'is-loading' : ''}`}
              type="submit"
              disabled={loading}
            >
              <span className="icon">
                <i className="fas fa-save"></i>
              </span>
              <span>Create Task</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default TaskForm;