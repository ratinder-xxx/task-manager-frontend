import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import AddMemberModal from "./AddMemberModal";

const MembersList = ({ project, projectId, onMemberRemoved }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [members, setMembers] = useState(project?.members || []);

  const handleRemoveMember = async (memberId, memberName) => {
    if (window.confirm(`Remove ${memberName} from this project?`)) {
      try {
        await axios.delete(
          `${import.meta.env.VITE_API_URL}/api/projects/${projectId}/members/${memberId}`
        );
        setMembers(members.filter(m => m._id !== memberId));
        onMemberRemoved(memberId);
        toast.success(`${memberName} removed from project`);
      } catch (error) {
        toast.error(error.response?.data?.error || "Failed to remove member");
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Team Members</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
        >
          + Add Member
        </button>
      </div>

      <div className="space-y-2">
        {console.log(project)}
        {/* Project Owner */}
        {project?.owner && (
          <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <div>
              <div className="font-medium">{project.owner.username}</div>
              <div className="text-xs text-gray-500">Project Owner</div>
            </div>
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              Owner
            </span>
          </div>
        )}

        {/* Team Members */}
        {members.map((member) => (
          <div
            key={member._id}
            className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"
          >
            <div>
              <div className="font-medium">{member.username}</div>
              <div className="text-xs text-gray-500">{member.email}</div>
              <div className="text-xs text-gray-400">Role: {member.role}</div>
            </div>
            {project?.owner?._id !== member._id && (
              <button
                onClick={() => handleRemoveMember(member._id, member.username)}
                className="text-red-500 hover:text-red-600 text-sm"
              >
                Remove
              </button>
            )}
          </div>
        ))}

        {members.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            No team members yet
          </div>
        )}
      </div>

      {showAddModal && (
        <AddMemberModal
          projectId={projectId}
          onClose={() => setShowAddModal(false)}
          onMemberAdded={(newMember) => {
            setMembers([...members, newMember]);
          }}
        />
      )}
    </div>
  );
};

export default MembersList;