import "../assets/css/Sidebar.css";

export default function Sidebar({ isOpen, toggleSidebar, createNewChat, setCurrentId, conversations, currentId }) {
  return (
    <div className={`sidebar ${isOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <button
        className="sidebar-toggle"
        onClick={toggleSidebar}
        title={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 18l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      {isOpen && (
        <button className="sidebar-newChatBtn" onClick={createNewChat}>
          + New chat
        </button>
      )}
      {isOpen && (
        <div className="sidebar-content">
          <div className="sidebar-header">Your chats</div>
          {conversations.map((c) => (
            <div
              key={c.id}
              className="sidebar-chatItem"
              style={{
                background:
                  c.id === currentId ? "#e5e7eb" : "transparent",
              }}
              onClick={() => setCurrentId(c.id)}
            >
              {c.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
