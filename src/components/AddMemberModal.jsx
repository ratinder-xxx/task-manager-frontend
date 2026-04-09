import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const AddMemberModal = ({ projectId, onClose, onMemberAdded }) => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Fetch all users except current project members
  useEffect(() => {
    fetchUsers();
  }, [searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/users?search=${searchTerm}`
      );
      setUsers(response.data.users);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUser) {
      toast.error("Please select a user");
      return;
    }

    try {
      await axios.post(
        `/api/projects/${projectId}/members`,
        { memberId: selectedUser._id }
      );
      toast.success(`${selectedUser.username} added to project successfully`);
      onMemberAdded(selectedUser);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to add member");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Add Team Member</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {users.map((user) => (
              <div
                key={user._id}
                onClick={() => setSelectedUser(user)}
                className={`p-3 border rounded-lg cursor-pointer transition ${
                  selectedUser?._id === user._id
                    ? "border-blue-500 bg-blue-50"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="font-semibold">{user.username}</div>
                <div className="text-sm text-gray-600">{user.email}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Role: {user.role}
                </div>
              </div>
            ))}
            {users.length === 0 && searchTerm && (
              <div className="text-center text-gray-500 py-4">
                No users found
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleAddMember}
            disabled={!selectedUser}
            className={`px-4 py-2 rounded-lg ${
              selectedUser
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Add Member
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal;