import { useState, useEffect } from 'react';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import { Task } from './types/Task';
import { getTasks, getExecutedTasks, updateTask } from './services/api';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [executedTasks, setExecutedTasks] = useState<Task[]>([]);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  // Função para forçar a atualização dos dados
  const refreshData = () => {
    setRefreshCounter(prev => prev + 1);
  };
  
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setRetryCount(0);
        
        const pendingTasks = await getTasks();
        setTasks(pendingTasks.filter(task => task.status === 'pending'));
        
        const executedTasks = await getExecutedTasks();
        setExecutedTasks(executedTasks);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        setRetryCount(prev => prev + 1);
      }
    };
    
    fetchTasks();
    
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [refreshCounter, retryCount]);
  
  const handleTaskCreated = () => {
    refreshData();
  };
  
  const handleTaskDeleted = () => {
    refreshData();
  };
  
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };
  
  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask?.id) return;

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const updatedTask: Partial<Task> = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
      };

      if (editingTask.type === 'one-time') {
        const scheduledTime = formData.get('scheduledTime');
        if (scheduledTime) {
          updatedTask.scheduledTime = new Date(scheduledTime as string);
        }
      } else {
        updatedTask.cronExpression = formData.get('cronExpression') as string;
      }

      await updateTask(editingTask.id, updatedTask);
      setEditingTask(null);
      refreshData();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };
  
  return (
    <div className="has-background-light">
      <nav className="navbar is-primary">
        <div className="container">
          <div className="navbar-brand">
            <span className="navbar-item">
              <i className="fas fa-calendar-check mr-2"></i>
              Task Scheduler
            </span>
          </div>
        </div>
      </nav>

      <section className="section">
        <div className="container">
          <div className="columns">
            <div className="column is-8 is-offset-2">
              <TaskForm onTaskCreated={handleTaskCreated} />
              
              <div className="mt-6">
                <div className="tabs is-boxed">
                  <ul>
                    <li className="is-active">
                      <button className="button is-text">
                        <span className="icon"><i className="fas fa-clock"></i></span>
                        <span>Pending Tasks</span>
                      </button>
                    </li>
                    <li>
                      <button className="button is-text">
                        <span className="icon"><i className="fas fa-check"></i></span>
                        <span>Executed Tasks</span>
                      </button>
                    </li>
                  </ul>
                </div>

                <TaskList
                  tasks={tasks}
                  title="Pending Tasks"
                  onTaskDeleted={handleTaskDeleted}
                  onTaskEdit={handleEditTask}
                />

                <TaskList
                  tasks={executedTasks}
                  title="Executed Tasks"
                  onTaskDeleted={handleTaskDeleted}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Edit Modal */}
      {editingTask && (
        <div className="modal is-active">
          <div className="modal-background" onClick={() => setEditingTask(null)}></div>
          <div className="modal-card">
            <header className="modal-card-head">
              <p className="modal-card-title">
                <span className="icon-text">
                  <span className="icon">
                    <i className="fas fa-edit"></i>
                  </span>
                  <span>Edit Task</span>
                </span>
              </p>
              <button 
                className="delete" 
                aria-label="close"
                onClick={() => setEditingTask(null)}
              ></button>
            </header>
            
            <form onSubmit={handleUpdateTask}>
              <section className="modal-card-body">
                <div className="field">
                  <label className="label">Title</label>
                  <div className="control">
                    <input
                      className="input"
                      type="text"
                      name="title"
                      defaultValue={editingTask.title}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="label">Description</label>
                  <div className="control">
                    <textarea
                      className="textarea"
                      name="description"
                      defaultValue={editingTask.description || ''}
                    />
                  </div>
                </div>

                {editingTask.type === 'one-time' && (
                  <div className="field">
                    <label className="label">Date and Time</label>
                    <div className="control">
                      <input
                        className="input"
                        type="datetime-local"
                        name="scheduledTime"
                        defaultValue={editingTask.scheduledTime 
                          ? new Date(editingTask.scheduledTime).toISOString().slice(0, 16)
                          : ''
                        }
                      />
                    </div>
                  </div>
                )}

                {editingTask.type === 'recurring' && (
                  <div className="field">
                    <label className="label">Cron Expression</label>
                    <div className="control">
                      <input
                        className="input"
                        type="text"
                        name="cronExpression"
                        defaultValue={editingTask.cronExpression}
                        placeholder="* * * * *"
                      />
                    </div>
                    <p className="help">Format: minute hour day-of-month month day-of-week</p>
                  </div>
                )}
              </section>

              <footer className="modal-card-foot">
                <button type="submit" className="button is-success">
                  <span className="icon">
                    <i className="fas fa-save"></i>
                  </span>
                  <span>Save Changes</span>
                </button>
                <button type="button" className="button" onClick={() => setEditingTask(null)}>
                  Cancel
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;