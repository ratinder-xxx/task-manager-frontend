import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    fetchProjectAndTasks();
  }, [projectId]);

  useEffect(() => {
    if (socket && projectId) {
      socket.emit("join-project", projectId);

      socket.on("task-created", (task) => {
        setTasks(prev => [...prev, task]);
        toast.success(`New task: ${task.title}`);
      });

      socket.on("task-updated", (updatedTask) => {
        setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
        toast.info(`Task updated: ${updatedTask.title}`);
      });

      socket.on("task-status-changed", (data) => {
        setTasks(prev => prev.map(t => 
          t._id === data.taskId ? { ...t, status: data.status } : t
        ));
        toast.info(`Task status changed by ${data.updatedBy}`);
      });

      socket.on("task-deleted", (data) => {
        setTasks(prev => prev.filter(t => t._id !== data.taskId));
        toast.info(`Task deleted by ${data.deletedBy}`);
      });

      return () => {
        socket.emit("leave-project", projectId);
        socket.off("task-created");
        socket.off("task-updated");
        socket.off("task-status-changed");
        socket.off("task-deleted");
      };
    }
  }, [socket, projectId]);

  const fetchProjectAndTasks = async () => {
    try {
      const [projectRes, tasksRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}`),
        axios.get(`${import.meta.env.VITE_API_URL}/api/tasks/projects/${projectId}/tasks`)
      ]);
      setProject(projectRes.data);
      setTasks(tasksRes.data);
    } catch (error) {
      toast.error("Failed to fetch project data");
      navigate("/projects");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/tasks/projects/${projectId}/tasks`,
        newTask
      );
      const createdTask = response.data;
      setTasks([...tasks, createdTask]);
      if (socket) {
        socket.emit("task-created", {
          projectId,
          task: createdTask
        });
      }
      setShowModal(false);
      setNewTask({ title: "", description: "", status: "todo" });
      toast.success("Task created successfully");
    } catch (error) {
      toast.error("Failed to create task");
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const response = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/tasks/tasks/${taskId}/status`,
        { status: newStatus }
      );
      const updatedTask = response.data;
      setTasks(prev => prev.map(t => t._id === taskId ? updatedTask : t));
      if (socket) {
        socket.emit("task-status-changed", {
          projectId,
          taskId,
          status: newStatus
        });
      }
      toast.success("Task status updated");
    } catch (error) {
      toast.error("Failed to update task status");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/tasks/tasks/${taskId}`);
        setTasks(prev => prev.filter(t => t._id !== taskId));
        if (socket) {
          socket.emit("task-deleted", {
            projectId,
            taskId
          });
        }
        toast.success("Task deleted successfully");
      } catch (error) {
        toast.error("Failed to delete task");
      }
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
        <div className="text-xl">Loading...</div>
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
              className="text-blue-500 hover:text-blue-600 mr-4"
            >
              ← Back to Projects
            </button>
            <h1 className="text-2xl font-bold inline">{project?.name}</h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Add Task
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statusColumns.map(column => (
            <div key={column.id} className={`${column.color} rounded-lg p-4 min-h-96`}>
              <h2 className="text-xl font-bold mb-4 text-center">{column.title}</h2>
              <div className="space-y-3">
                {getTasksByStatus(column.id).map(task => (
                  <div key={task._id} className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-semibold text-lg mb-2">{task.title}</h3>
                    <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                    <div className="flex justify-between items-center">
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task._id, e.target.value)}
                        className="text-sm border rounded px-2 py-1"
                      >
                        <option value="todo">To Do</option>
                        <option value="in-progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                      <button
                        onClick={() => handleDeleteTask(task._id)}
                        className="text-red-500 hover:text-red-600 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Create New Task</h2>
            <form onSubmit={handleCreateTask}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
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
              <div className="mb-4">
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
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Create
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