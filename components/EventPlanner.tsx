
import React, { useState } from 'react';
import { EventExpense, EventTask, TaskStatus } from '../types';
import { ArrowLeft, Plus, User, DollarSign, Trash2, CheckCircle2, Circle, Clock, Pencil, X, Save } from 'lucide-react';

interface EventPlannerProps {
  event: EventExpense;
  onBack: () => void;
  onUpdateEvent: (updatedEvent: EventExpense) => void;
}

export const EventPlanner: React.FC<EventPlannerProps> = ({ event, onBack, onUpdateEvent }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskBudget, setNewTaskBudget] = useState('');
  
  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Edit State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [editBudget, setEditBudget] = useState('');

  const tasks = event.tasks || [];

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;

    const newTask: EventTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle,
      assignee: newTaskAssignee || 'Unassigned',
      budget: parseFloat(newTaskBudget) || 0,
      status: 'Todo'
    };

    const updatedTasks = [...tasks, newTask];
    onUpdateEvent({ ...event, tasks: updatedTasks });
    
    setNewTaskTitle('');
    setNewTaskAssignee('');
    setNewTaskBudget('');
  };

  const handleUpdateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    onUpdateEvent({ ...event, tasks: updatedTasks });
  };

  const handleDeleteTask = (taskId: string) => {
    if(!confirm("Delete this task?")) return;
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    onUpdateEvent({ ...event, tasks: updatedTasks });
  };

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    if (!draggedTaskId) return;
    
    // Optimistic update logic could go here, but strict state update is safer
    if (tasks.find(t => t.id === draggedTaskId)?.status !== targetStatus) {
       handleUpdateTaskStatus(draggedTaskId, targetStatus);
    }
    setDraggedTaskId(null);
  };

  // Edit Handlers
  const startEditing = (task: EventTask) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditAssignee(task.assignee);
    setEditBudget(task.budget.toString());
  };

  const saveEdit = () => {
    if (!editingTaskId) return;
    const updatedTasks = tasks.map(t => {
      if (t.id === editingTaskId) {
        return {
          ...t,
          title: editTitle,
          assignee: editAssignee,
          budget: parseFloat(editBudget) || 0
        };
      }
      return t;
    });
    onUpdateEvent({ ...event, tasks: updatedTasks });
    setEditingTaskId(null);
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
  };


  const totalTaskBudget = tasks.reduce((sum, t) => sum + t.budget, 0);
  const remainingBudget = event.amount - totalTaskBudget;

  const renderColumn = (status: TaskStatus, title: string, colorClass: string, icon: React.ReactNode) => {
    const columnTasks = tasks.filter(t => t.status === status);

    return (
      <div 
        className="flex flex-col bg-slate-100 rounded-xl p-4 transition-colors"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, status)}
      >
        <div className={`flex-none flex items-center gap-2 mb-4 pb-2 border-b border-slate-200 ${colorClass}`}>
          {icon}
          <h3 className="font-bold text-slate-700">{title}</h3>
          <span className="ml-auto bg-white px-2 py-0.5 rounded-full text-xs font-bold text-slate-500 shadow-sm">
            {columnTasks.length}
          </span>
        </div>
        
        {/* Full height content, no internal scroll */}
        <div className="space-y-3 min-h-[100px]">
          {columnTasks.map(task => {
            const isEditing = editingTaskId === task.id;

            if (isEditing) {
              return (
                <div key={task.id} className="bg-white p-3 rounded-lg shadow-md border-2 border-emerald-500/50 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                  <input 
                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-slate-700"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="Task Title"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  />
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <User className="absolute left-2 top-2 w-3.5 h-3.5 text-slate-400" />
                      <input 
                        className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={editAssignee}
                        onChange={e => setEditAssignee(e.target.value)}
                        placeholder="Assignee"
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                      />
                    </div>
                    <div className="relative w-24">
                      <span className="absolute left-2 top-2 text-xs text-slate-400 font-bold">RM</span>
                      <input 
                        className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-200 rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                        type="number"
                        value={editBudget}
                        onChange={e => setEditBudget(e.target.value)}
                        placeholder="0"
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
                    <button onClick={cancelEdit} className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                    <button onClick={saveEdit} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded hover:bg-emerald-700 shadow-sm transition-colors">
                      <Save className="w-3.5 h-3.5" /> Save
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={task.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                className={`bg-white p-3 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-all group cursor-grab active:cursor-grabbing ${draggedTaskId === task.id ? 'opacity-40 scale-95' : 'opacity-100'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium text-slate-800 text-sm leading-snug">{task.title}</p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => startEditing(task)}
                      className="p-1 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                      title="Edit Task"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                      title="Delete Task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-slate-500 mt-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                      <User className="w-3 h-3" />
                      <span className="truncate max-w-[80px]">{task.assignee}</span>
                    </div>
                    {task.budget > 0 && (
                      <div className="flex items-center gap-1 text-emerald-600 font-medium">
                        <DollarSign className="w-3 h-3" />
                        <span>{task.budget.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile/Quick Actions (Visible only if not dragged) */}
                {draggedTaskId !== task.id && (
                  <div className="mt-3 flex gap-1 justify-end pt-2 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
                    {status !== 'Todo' && (
                      <button 
                        onClick={() => handleUpdateTaskStatus(task.id, 'Todo')}
                        className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 rounded text-slate-600"
                      >
                        To Do
                      </button>
                    )}
                    {status !== 'InProgress' && (
                      <button 
                        onClick={() => handleUpdateTaskStatus(task.id, 'InProgress')}
                        className="px-2 py-1 text-[10px] bg-blue-50 hover:bg-blue-100 rounded text-blue-600"
                      >
                        In Prog
                      </button>
                    )}
                    {status !== 'Done' && (
                      <button 
                        onClick={() => handleUpdateTaskStatus(task.id, 'Done')}
                        className="px-2 py-1 text-[10px] bg-emerald-50 hover:bg-emerald-100 rounded text-emerald-600"
                      >
                        Done
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {columnTasks.length === 0 && (
            <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
              <p className="text-xs text-slate-400 font-medium">Drop items here</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-4 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                {event.name} 
                <span className="text-sm font-normal text-slate-500 px-2 py-1 bg-slate-100 rounded-md border border-slate-200">
                  {event.month}
                </span>
              </h1>
              <p className="text-slate-500 text-sm mt-1">Manage tasks, assignments, and operational costs.</p>
            </div>
            
            <div className="flex gap-4">
               <div className="text-right">
                 <span className="block text-xs text-slate-400 uppercase font-bold">Total Budget</span>
                 <span className="block text-xl font-bold text-emerald-600">RM {event.amount.toLocaleString()}</span>
               </div>
               <div className="w-px bg-slate-200 h-10"></div>
               <div className="text-right">
                 <span className="block text-xs text-slate-400 uppercase font-bold">Allocated</span>
                 <span className="block text-xl font-bold text-blue-600">RM {totalTaskBudget.toLocaleString()}</span>
               </div>
               <div className="w-px bg-slate-200 h-10"></div>
               <div className="text-right">
                 <span className="block text-xs text-slate-400 uppercase font-bold">Remaining</span>
                 <span className={`block text-xl font-bold ${remainingBudget < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                   RM {remainingBudget.toLocaleString()}
                 </span>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Add Task Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-8">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-500" /> Add New Task
          </h3>
          <div className="flex flex-col md:flex-row gap-3">
            <input 
              type="text" 
              placeholder="What needs to be done?"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            />
            <div className="flex gap-3">
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Assignee"
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                  className="pl-9 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-40"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">RM</span>
                <input 
                  type="number" 
                  placeholder="Cost"
                  value={newTaskBudget}
                  onChange={(e) => setNewTaskBudget(e.target.value)}
                  className="pl-9 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-32"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                />
              </div>
              <button 
                onClick={handleAddTask}
                className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {renderColumn('Todo', 'To Do', 'text-slate-500', <Circle className="w-5 h-5" />)}
          {renderColumn('InProgress', 'In Progress', 'text-blue-500', <Clock className="w-5 h-5" />)}
          {renderColumn('Done', 'Completed', 'text-emerald-500', <CheckCircle2 className="w-5 h-5" />)}
        </div>
      </div>
    </div>
  );
};
