import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useSocket } from "../context/SocketContext";
import toast from "react-hot-toast";

const TaskBoard = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", status: "todo" });

  // Fetch data on component mount and when projectId changes
  const fetchProjectAndTasks = useCallback(async () => {
    try {
      setLoading(true);
      const [projectRes, tasksRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}`),
        axios.get(`${import.meta.env.VITE_API_URL}/api/tasks/projects/${projectId}/tasks`)
      ]);
      setProject(projectRes.data);
      setTasks(tasksRes.data);
      console.log("Tasks loaded from backend:", tasksRes.data.length);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to fetch project data");
      navigate("/projects");
    } finally {
      setLoading(false);
    }
  }, [projectId, navigate]);

  // Initial fetch
  useEffect(() => {
    fetchProjectAndTasks();
  }, [fetchProjectAndTasks]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !projectId) return;

    console.log("Setting up socket connection for project:", projectId);
    socket.emit("join-project", projectId);

    // FIX 1: Only add task if it doesn't already exist (prevent duplicates)
    const handleTaskCreated = (task) => {
      console.log("Socket received task-created:", task);
      setTasks(prev => {
        // Check if task already exists in state
        const exists = prev.some(t => t._id === task._id);
        if (!exists) {
          toast.success(`New task: ${task.title}`);
          return [...prev, task];
        }
        return prev;
      });
    };

    // Handle task updates
    const handleTaskUpdated = (updatedTask) => {
      console.log("Socket received task-updated:", updatedTask);
      setTasks(prev => prev.map(t => 
        t._id === updatedTask._id ? updatedTask : t
      ));
      toast.success(`Task updated: ${updatedTask.title}`);
    };

    // Handle status changes
    const handleTaskStatusChanged = (data) => {
      console.log("Socket received task-status-changed:", data);
      setTasks(prev => prev.map(t => 
        t._id === data.taskId ? { ...t, status: data.status } : t
      ));
      toast.success(`Task status changed to ${data.status} by ${data.updatedBy}`);
    };

    // Handle task deletions
    const handleTaskDeleted = (data) => {
      console.log("Socket received task-deleted:", data);
      setTasks(prev => prev.filter(t => t._id !== data.taskId));
      toast.success(`Task deleted by ${data.deletedBy}`);
    };

    // Register event listeners
    socket.on("task-created", handleTaskCreated);
    socket.on("task-updated", handleTaskUpdated);
    socket.on("task-status-changed", handleTaskStatusChanged);
    socket.on("task-deleted", handleTaskDeleted);

    // Cleanup
    return () => {
      console.log("Cleaning up socket listeners");
      socket.emit("leave-project", projectId);
      socket.off("task-created", handleTaskCreated);
      socket.off("task-updated", handleTaskUpdated);
      socket.off("task-status-changed", handleTaskStatusChanged);
      socket.off("task-deleted", handleTaskDeleted);
    };
  }, [socket, projectId]);

  // FIX 2: Create task without double-adding
  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    if (!newTask.title.trim()) {
      toast.error("Task title is required");
      return;
    }

    try {
      console.log("Creating task:", newTask);
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/tasks/projects/${projectId}/tasks`,
        newTask
      );
      
      const createdTask = response.data;
      console.log("Task created successfully:", createdTask);
      
      // FIX 3: Add to local state only once (from API response)
      setTasks(prev => [...prev, createdTask]);
      
      // FIX 4: Emit to OTHER users only (backend will handle broadcasting to others)
      if (socket) {
        socket.emit("task-created", {
          projectId,
          task: createdTask
        });
      }
      
      // Reset form and close modal
      setNewTask({ title: "", description: "", status: "todo" });
      setShowModal(false);
      toast.success("Task created successfully");
      
    } catch (error) {
      console.error("Failed to create task:", error);
      toast.error(error.response?.data?.error || "Failed to create task");
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      console.log("Updating task status:", taskId, "to", newStatus);
      const response = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/tasks/tasks/${taskId}/status`,
        { status: newStatus }
      );
      
      const updatedTask = response.data;
      
      // Update local state
      setTasks(prev => prev.map(t => t._id === taskId ? updatedTask : t));
      
      // Emit to other users
      if (socket) {
        socket.emit("task-status-changed", {
          projectId,
          taskId,
          status: newStatus
        });
      }
      
      toast.success("Task status updated");
    } catch (error) {
      console.error("Failed to update task status:", error);
      toast.error("Failed to update task status");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    
    try {
      console.log("Deleting task:", taskId);
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/tasks/tasks/${taskId}`);
      
      // Update local state
      setTasks(prev => prev.filter(t => t._id !== taskId));
      
      // Emit to other users
      if (socket) {
        socket.emit("task-deleted", {
          projectId,
          taskId
        });
      }
      
      toast.success("Task deleted successfully");
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast.error("Failed to delete task");
    }
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  const statusColumns = [
    { id: "todo", title: "To Do", color: "bg-gray-100" },
    { id: "in-progress", title: "In Progress", color: "bg-yellow-100" },
    { id: "done", title: "Done", color: "bg-green-100" }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <button
              onClick={() => navigate("/projects")}
              className="text-blue-500 cursor-pointer hover:text-blue-600 mr-4"
            >
              ← Back to Projects
            </button>
            <h1 className="text-2xl font-bold inline">{project?.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{project?.description}</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-500 cursor-pointer text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Add Task
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statusColumns.map(column => (
            <div key={column.id} className={`${column.color} rounded-lg p-4 min-h-96`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{column.title}</h2>
                <span className="bg-white px-2 py-1 rounded-full text-sm">
                  {getTasksByStatus(column.id).length}
                </span>
              </div>
              <div className="space-y-3">
                {getTasksByStatus(column.id).map(task => (
                  <div key={task._id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition">
                    <h3 className="font-semibold text-lg mb-2">{task.title}</h3>
                    {task.description && (
                      <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                    )}
                    <div className="flex justify-between items-center">
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task._id, e.target.value)}
                        className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="todo">To Do</option>
                        <option value="in-progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                      <button
                        onClick={() => handleDeleteTask(task._id)}
                        className="text-red-500 cursor-pointer hover:text-red-600 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      Created: {new Date(task.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {getTasksByStatus(column.id).length === 0 && (
                  <div className="text-center text-gray-500 py-8 bg-white rounded-lg">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Create New Task</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 cursor-pointer hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  autoFocus
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 mb-2">Status</label>
                <select
                  value={newTask.status}
                  onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 cursor-pointer border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 cursor-pointer bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskBoard;