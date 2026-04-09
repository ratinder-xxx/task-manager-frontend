import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import MembersList from "./MemberList";

const ProjectList = () => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", description: "" });
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, [showMembersModal]);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/projects`,
      );
      setProjects(response.data);
    } catch (error) {
      toast.error("Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/projects`,
        newProject,
      );
      setProjects([...projects, response.data]);
      setShowModal(false);
      setNewProject({ name: "", description: "" });
      toast.success("Project created successfully");
    } catch (error) {
      console.log(error);
      toast.error("Failed to create project");
    }
  };

  const handleDeleteProject = async (id) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      try {
        await axios.delete(
          `${import.meta.env.VITE_API_URL}/api/projects/${id}`,
        );
        setProjects(projects.filter((p) => p._id !== id));
        toast.success("Project deleted successfully");
      } catch (error) {
        toast.error("Failed to delete project");
      }
    }
  };

  const handleViewMembers = (project) => {
    setSelectedProject(project);
    setShowMembersModal(true);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

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
          <h1 className="text-2xl font-bold">Projects</h1>
          <div className="space-x-4 flex h-full">
            <h1 className="text-xl text-gray-500 flex items-center">
              Hello, {user?.username}
            </h1>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-500 cursor-pointer text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              New Project
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-500 cursor-pointer text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              className="bg-white rounded-lg shadow-md p-6"
              key={project._id}
            >
              <h3 className="text-xl font-semibold mb-2">{project.name}</h3>
              <p className="text-gray-600 mb-4">{project.description}</p>

              {/* Show member count */}
              <div className="text-sm text-gray-500 mb-3">
                {project.members?.length || 1} members
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => navigate(`/projects/${project._id}`)}
                  className="bg-green-500 cursor-pointer text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  View Tasks
                </button>
                <div className="space-x-2">
                  <button
                    onClick={() => handleViewMembers(project)}
                    className="bg-blue-500 cursor-pointer text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Members
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project._id)}
                    className="bg-red-500 cursor-pointer text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Create New Project</h2>
            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) =>
                    setNewProject({ ...newProject, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Description</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 cursor-pointer py-2 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 cursor-pointer py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showMembersModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {selectedProject.name} - Members
              </h2>
              <button
                onClick={() => setShowMembersModal(false)}
                className="text-gray-500 cursor-pointer hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <MembersList
              project={selectedProject}
              projectId={selectedProject._id}
              onMemberRemoved={() => {
                // Refresh project list to update members
                fetchProjects();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;
