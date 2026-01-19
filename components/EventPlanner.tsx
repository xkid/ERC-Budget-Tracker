
import React, { useState } from 'react';
import { EventExpense, EventTask, TaskStatus, ChecklistItem } from '../types';
import { ArrowLeft, Plus, User, DollarSign, Trash2, CheckCircle2, Circle, Clock, Pencil, X, Save, AlignLeft, CheckSquare, Square, Link as LinkIcon, ExternalLink, CornerUpLeft } from 'lucide-react';

interface EventPlannerProps {
  event: EventExpense;
  allEvents: EventExpense[]; // Needed for linking dropdown
  isCentral: boolean; // Flag to determine if this is the shared board
  centralTasks: EventTask[]; // The shared tasks
  returnToEvent?: EventExpense; // The event to return to (e.g., Central Board)
  onBack: () => void;
  onUpdateEvent: (updatedEvent: EventExpense) => void;
  onUpdateCentralTasks: (tasks: EventTask[]) => void;
  onNavigateToEvent: (eventId: string) => void; // Callback to jump to another event
  onReturn?: () => void; // Callback to go back to the source event
}

export const EventPlanner: React.FC<EventPlannerProps> = ({ 
  event, 
  allEvents,
  isCentral, 
  centralTasks,
  returnToEvent,
  onBack, 
  onUpdateEvent, 
  onUpdateCentralTasks,
  onNavigateToEvent,
  onReturn
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskBudget, setNewTaskBudget] = useState('');
  
  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Edit State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editChecklist, setEditChecklist] = useState<ChecklistItem[]>([]);
  const [editLinkedEventId, setEditLinkedEventId] = useState<string>('');
  const [checklistInput, setChecklistInput] = useState('');

  // Determine which set of tasks to use
  const tasks = isCentral ? centralTasks : (event.tasks || []);

  const handleUpdateTasks = (updatedTasks: EventTask[]) => {
    if (isCentral) {
      onUpdateCentralTasks(updatedTasks);
    } else {
      onUpdateEvent({ ...event, tasks: updatedTasks });
    }
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;

    const newTask: EventTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle,
      description: newTaskDescription,
      assignee: newTaskAssignee || 'Team',
      budget: parseFloat(newTaskBudget) || 0,
      status: 'Todo',
      checklist: [],
      linkedEventId: ''
    };

    handleUpdateTasks([...tasks, newTask]);
    
    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskAssignee('');
    setNewTaskBudget('');
  };

  const handleUpdateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    handleUpdateTasks(updatedTasks);
  };

  const handleDeleteTask = (taskId: string) => {
    if(!confirm("Delete this task?")) return;
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    handleUpdateTasks(updatedTasks);
  };

  const handleToggleTaskCheckItem = (taskId: string, itemId: string) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId && t.checklist) {
        return {
          ...t,
          checklist: t.checklist.map(item => 
            item.id === itemId ? { ...item, completed: !item.completed } : item
          )
        };
      }
      return t;
    });
    handleUpdateTasks(updatedTasks);
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
    
    if (tasks.find(t => t.id === draggedTaskId)?.status !== targetStatus) {
       handleUpdateTaskStatus(draggedTaskId, targetStatus);
    }
    setDraggedTaskId(null);
  };

  // Edit Handlers
  const startEditing = (task: EventTask) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditAssignee(task.assignee);
    setEditBudget(task.budget.toString());
    setEditChecklist(task.checklist ? [...task.checklist] : []);
    setEditLinkedEventId(task.linkedEventId || '');
    setChecklistInput('');
  };

  const saveEdit = () => {
    if (!editingTaskId) return;
    const updatedTasks = tasks.map(t => {
      if (t.id === editingTaskId) {
        return {
          ...t,
          title: editTitle,
          description: editDescription,
          assignee: editAssignee,
          budget: parseFloat(editBudget) || 0,
          checklist: editChecklist,
          linkedEventId: editLinkedEventId
        };
      }
      return t;
    });
    handleUpdateTasks(updatedTasks);
    setEditingTaskId(null);
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
  };

  // Checklist Edit Handlers
  const addEditCheckItem = () => {
    if (!checklistInput.trim()) return;
    const newItem: ChecklistItem = {
        id: `cl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        text: checklistInput.trim(),
        completed: false
    };
    setEditChecklist([...editChecklist, newItem]);
    setChecklistInput('');
  };

  const toggleEditCheckItem = (id: string) => {
      setEditChecklist(editChecklist.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
  };

  const deleteEditCheckItem = (id: string) => {
      setEditChecklist(editChecklist.filter(i => i.id !== id));
  };
  
  const updateEditCheckItemText = (id: string, text: string) => {
      setEditChecklist(editChecklist.map(i => i.id === id ? { ...i, text } : i));
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
            const linkedEvent = task.linkedEventId ? allEvents.find(e => e.id === task.linkedEventId) : null;

            if (isEditing) {
              return (
                <div key={task.id} className="bg-white p-3 rounded-lg shadow-md border-2 border-emerald-500/50 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                  <input 
                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-slate-700 bg-white"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="Task Title"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  />
                  <textarea
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-slate-700 bg-white"
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    placeholder="Description (optional)"
                    rows={2}
                  />
                  
                  {/* Link Event Selector (Only for Central Board) */}
                  {isCentral && (
                      <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded border border-slate-100">
                          <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                          <select 
                            className="flex-1 text-xs bg-transparent outline-none text-slate-600"
                            value={editLinkedEventId}
                            onChange={(e) => setEditLinkedEventId(e.target.value)}
                          >
                            <option value="">-- Link to Event (Optional) --</option>
                            {allEvents
                                .filter(e => e.id !== event.id) // Don't link to self
                                .map(e => (
                                <option key={e.id} value={e.id}>{e.name} ({e.month})</option>
                            ))}
                          </select>
                      </div>
                  )}

                  {/* Checklist Editor */}
                  <div className="pt-2 border-t border-slate-100">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Checklist</h4>
                    <div className="space-y-2 mb-2">
                        {editChecklist.map(item => (
                            <div key={item.id} className="flex items-start gap-2">
                                <button 
                                    onClick={() => toggleEditCheckItem(item.id)}
                                    className={`mt-0.5 ${item.completed ? 'text-emerald-500' : 'text-slate-300'}`}
                                >
                                    {item.completed ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                                </button>
                                <input 
                                    className={`flex-1 text-xs bg-transparent outline-none border-b border-transparent focus:border-emerald-300 pb-0.5 ${item.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}
                                    value={item.text}
                                    onChange={(e) => updateEditCheckItemText(item.id, e.target.value)}
                                />
                                <button onClick={() => deleteEditCheckItem(item.id)} className="text-slate-300 hover:text-rose-500">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5 text-emerald-500" />
                        <input 
                            className="flex-1 text-xs border border-slate-200 rounded px-2 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-700"
                            placeholder="Add item..."
                            value={checklistInput}
                            onChange={(e) => setChecklistInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addEditCheckItem()}
                        />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <div className="relative flex-1">
                      <User className="absolute left-2 top-2 w-3.5 h-3.5 text-slate-400" />
                      <input 
                        className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-700"
                        value={editAssignee}
                        onChange={e => setEditAssignee(e.target.value)}
                        placeholder="Assignee"
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                      />
                    </div>
                    <div className="relative w-24">
                      <span className="absolute left-2 top-2 text-xs text-slate-400 font-bold">RM</span>
                      <input 
                        className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-200 rounded focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-700"
                        type="number"
                        value={editBudget}
                        onChange={e => setEditBudget(e.target.value)}
                        placeholder="0"
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
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

            // --- READ MODE CARD ---
            return (
              <div 
                key={task.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                className={`bg-white p-3 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-all group cursor-grab active:cursor-grabbing ${draggedTaskId === task.id ? 'opacity-40 scale-95' : 'opacity-100'}`}
              >
                <div className="flex justify-between items-start mb-1">
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
                
                {task.description && (
                  <p className="text-xs text-slate-500 mb-3 whitespace-pre-wrap leading-relaxed">
                    {task.description}
                  </p>
                )}
                
                {/* Linked Event Button */}
                {linkedEvent && (
                    <button 
                        onClick={() => onNavigateToEvent(linkedEvent.id)}
                        className="w-full mb-3 flex items-center gap-2 p-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded text-xs text-indigo-700 transition-colors text-left"
                    >
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        <div className="truncate">
                            <span className="font-semibold">Linked:</span> {linkedEvent.name}
                        </div>
                    </button>
                )}

                {/* Checklist Display */}
                {task.checklist && task.checklist.length > 0 && (
                    <div className="mb-3 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-1">
                            <CheckSquare className="w-3 h-3" />
                            <span>{task.checklist.filter(i => i.completed).length}/{task.checklist.length}</span>
                        </div>
                        {task.checklist.map(item => (
                            <div key={item.id} className="flex items-start gap-1.5 group/item">
                                <button 
                                    onClick={() => handleToggleTaskCheckItem(task.id, item.id)}
                                    className={`mt-0.5 flex-shrink-0 ${item.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}
                                >
                                    {item.completed ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                                </button>
                                <span className={`text-[11px] leading-snug ${item.completed ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                                    {item.text}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="flex items-center justify-between text-xs text-slate-500 mt-2 border-t border-slate-50 pt-2">
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
                  <div className="mt-2 flex gap-1 justify-end pt-2 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
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
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          {returnToEvent && onReturn && (
              <button 
                onClick={onReturn}
                className="flex items-center gap-1 text-xs font-medium bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
              >
                  <CornerUpLeft className="w-3.5 h-3.5" />
                  Return to {returnToEvent.name}
              </button>
          )}

          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              {event.name}
              <span className="text-sm font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{event.month}</span>
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-2">
                Task Board & Budget Planner
                {isCentral && <span className="bg-purple-100 text-purple-700 px-1.5 rounded text-[10px] font-bold">CENTRAL BOARD</span>}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="block text-xs text-slate-400 uppercase font-bold">Event Budget</span>
            <span className="block text-lg font-bold text-slate-800">RM {event.amount.toLocaleString()}</span>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
           <div className="text-right">
            <span className="block text-xs text-slate-400 uppercase font-bold">Remaining</span>
            <span className={`block text-lg font-bold ${remainingBudget < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              RM {remainingBudget.toLocaleString()}
            </span>
          </div>
        </div>
      </header>

      {/* Main Board Area */}
      <div className="flex-1 p-6 overflow-x-auto">
        
        {/* Add Task Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
           <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
             <Plus className="w-4 h-4 text-emerald-500" /> New Task
           </h3>
           <div className="flex flex-col md:flex-row gap-3 items-start">
              <div className="flex-1 w-full space-y-2">
                 <input 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="Task Title (e.g. Book Venue)"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                 />
                 <input 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="Description (optional)"
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                 />
              </div>
              <div className="w-full md:w-48 relative">
                 <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                 <input 
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="Assignee"
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                 />
                 <div className="text-[10px] text-slate-400 mt-1 pl-1">Default: Team</div>
              </div>
              <div className="w-full md:w-32 relative">
                 <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-bold">RM</span>
                 <input 
                    type="number"
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                    placeholder="0"
                    value={newTaskBudget}
                    onChange={(e) => setNewTaskBudget(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                 />
              </div>
              <button 
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim()}
                className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm h-[42px]"
              >
                Add
              </button>
           </div>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full items-start pb-10">
          {renderColumn('Todo', 'To Do', 'border-slate-300 text-slate-600', <Circle className="w-5 h-5 text-slate-400" />)}
          {renderColumn('InProgress', 'In Progress', 'border-blue-300 text-blue-600', <Clock className="w-5 h-5 text-blue-500" />)}
          {renderColumn('Done', 'Completed', 'border-emerald-300 text-emerald-600', <CheckCircle2 className="w-5 h-5 text-emerald-500" />)}
        </div>

      </div>
    </div>
  );
};
