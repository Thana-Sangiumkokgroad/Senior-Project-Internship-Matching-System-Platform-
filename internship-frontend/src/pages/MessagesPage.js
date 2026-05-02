import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';
import './MessagesPage.css';

const MessagesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null); // { userId, name, email, role, roleIcon }
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // msgId to delete
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // ── helpers ──────────────────────────────────────────────
  const getInitials = (name) =>
    (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  // Avatar: shows photo if available, else initials circle
  const Avatar = ({ name, photo, size = 'md' }) => {
    const sizeClass = size === 'lg' ? 'conv-avatar lg' : size === 'sm' ? 'conv-avatar sm' : 'conv-avatar';
    if (photo) {
      return (
        <div className={sizeClass} style={{ padding: 0, overflow: 'hidden' }}>
          <img
            src={`data:image/jpeg;base64,${photo}`}
            alt={name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
          />
        </div>
      );
    }
    return <div className={sizeClass}>{getInitials(name)}</div>;
  };
  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isYesterday) return 'Yesterday';
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  const formatDateDivider = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ── data fetching ─────────────────────────────────────────
  useEffect(() => {
    initData();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Load users first, then build conversations using the returned list
  const initData = async () => {
    const userList = await fetchAllUsers();
    await fetchConversations(userList);
  };

  const fetchAllUsers = async () => {
    try {
      const [studentsRes, companiesRes, supervisorsRes] = await Promise.all([
        api.get('/students').catch(() => ({ data: [] })),
        api.get('/companies').catch(() => ({ data: [] })),
        api.get('/supervisors').catch(() => ({ data: [] }))
      ]);
      const users = [
        ...(studentsRes.data || []).map(s => ({
          id: s.user_id || s.id, name: s.name, email: s.email,
          role: 'Student', roleIcon: '🎓', badgeClass: 'bg-info',
          photo: s.profile_image || null,
          studentTableId: s.id
        })),
        ...(companiesRes.data || []).map(c => ({
          id: c.user_id || c.id, name: c.company_name || c.name,
          email: c.hr_person_email || c.email,
          role: 'Company', roleIcon: '🏢', badgeClass: 'bg-warning',
          photo: c.company_logo || null,
          companyTableId: c.id
        })),
        ...(supervisorsRes.data || []).map(sp => ({
          id: sp.user_id || sp.id, name: sp.name, email: sp.email,
          role: 'Supervisor', roleIcon: '👨‍💼', badgeClass: 'bg-success',
          photo: sp.profile_image || sp.profile_photo || null
        }))
      ].filter(u => u.id !== user.id);
      setAllUsers(users);
      setFilteredUsers(users);
      return users;
    } catch (err) {
      console.error('Error fetching users:', err);
      return [];
    }
  };

  const fetchConversations = async (userList) => {
    // Use passed list (fresh from fetch) OR fall back to state
    const knownUsers = userList || allUsers;
    const lookupUser = (id) => knownUsers.find(u => String(u.id) === String(id));
    try {
      const [inboxRes, sentRes] = await Promise.all([
        api.get('/messages/inbox').catch(() => ({ data: [] })),
        api.get('/messages/sent').catch(() => ({ data: [] }))
      ]);
      const inbox = inboxRes.data || [];
      const sent = sentRes.data || [];
      const convMap = {};
      // inbox: receiver is me, sender is other
      inbox.forEach(msg => {
        const otherId = msg.sender_id;
        const otherUser = lookupUser(otherId);
        const ts = msg.sent_at || msg.created_at;
        if (!convMap[otherId] || new Date(ts) > new Date(convMap[otherId].ts)) {
          convMap[otherId] = {
            userId: otherId,
            name: otherUser?.name || msg.sender_name || msg.sender_email || `User ${otherId}`,
            email: msg.sender_email || otherUser?.email || '',
            photo: otherUser?.photo || null,
            role: otherUser?.role || null,
            studentTableId: otherUser?.studentTableId || null,
            companyTableId: otherUser?.companyTableId || null,
            lastMsg: msg, ts,
            unread: convMap[otherId]?.unread || 0
          };
        }
        if (!msg.is_read) {
          convMap[otherId].unread = (convMap[otherId].unread || 0) + 1;
        }
      });
      // sent: sender is me, receiver is other
      sent.forEach(msg => {
        const otherId = msg.receiver_id;
        const otherUser = lookupUser(otherId);
        const ts = msg.sent_at || msg.created_at;
        if (!convMap[otherId] || new Date(ts) > new Date(convMap[otherId].ts)) {
          convMap[otherId] = {
            userId: otherId,
            name: otherUser?.name || msg.recipient_name || msg.recipient_email || `User ${otherId}`,
            email: msg.recipient_email || otherUser?.email || '',
            photo: otherUser?.photo || null,
            role: otherUser?.role || null,
            studentTableId: otherUser?.studentTableId || null,
            companyTableId: otherUser?.companyTableId || null,
            lastMsg: msg, ts,
            unread: convMap[otherId]?.unread || 0
          };
        }
      });
      const sorted = Object.values(convMap).sort(
        (a, b) => new Date(b.ts) - new Date(a.ts)
      );
      setConversations(sorted);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setLoading(false);
    }
  };

  const openConversation = async (conv) => {
    setActiveConv(conv);
    setShowNewChat(false);
    setSearchTerm('');
    try {
      const res = await api.get(`/messages/conversation/${conv.userId}`);
      setChatMessages(res.data || []);
      // mark unread as read
      (res.data || []).filter(m => m.sender_id !== user.id && !m.is_read)
        .forEach(m => api.put(`/messages/${m.id}/read`).catch(() => {}));
      setConversations(prev =>
        prev.map(c => String(c.userId) === String(conv.userId) ? { ...c, unread: 0 } : c)
      );
    } catch (err) {
      console.error('Error fetching chat:', err);
    }
  };

  const startNewChat = (selectedUser) => {
    const existing = conversations.find(c => String(c.userId) === String(selectedUser.id));
    if (existing) {
      openConversation(existing);
    } else {
      const newConv = { userId: selectedUser.id, name: selectedUser.name, email: selectedUser.email, photo: selectedUser.photo || null, unread: 0, role: selectedUser.role || null, studentTableId: selectedUser.studentTableId || null, companyTableId: selectedUser.companyTableId || null };
      setActiveConv(newConv);
      setChatMessages([]);
      setShowNewChat(false);
      setSearchTerm('');
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !activeConv) return;
    setSending(true);
    try {
      await api.post('/messages/send', {
        receiver_id: parseInt(activeConv.userId),
        content: newMessage.trim()
      });
      setNewMessage('');
      // Refresh conversation
      const res = await api.get(`/messages/conversation/${activeConv.userId}`);
      setChatMessages(res.data || []);
      fetchConversations(null);
    } catch (err) {
      console.error('Send error:', err);
      alert('❌ Error sending message: ' + (err.response?.data?.error || err.message));
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleDeleteMessage = (msgId) => {
    setConfirmDelete(msgId);
  };

  const confirmDeleteAction = async () => {
    const msgId = confirmDelete;
    setConfirmDelete(null);
    try {
      await api.delete(`/messages/${msgId}`);
      setChatMessages(prev => prev.filter(m => m.id !== msgId));
      fetchConversations(null);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ── render ────────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="chat-loading">
          <div className="spinner-border text-primary" role="status" />
        </div>
      </div>
    );
  }

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread || 0), 0);

  return (
    <div>
      <Navbar />
      <div className="chat-page">
        {/* ─── Left Panel: Conversation List ─── */}
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <div className="chat-sidebar-title">
              <span>💬 Messages</span>
              {totalUnread > 0 && <span className="unread-badge">{totalUnread}</span>}
            </div>
            <button
              className="btn-new-chat"
              title="New conversation"
              onClick={() => { setShowNewChat(true); setSearchTerm(''); setFilteredUsers(allUsers); setActiveConv(null); }}
            >
              <i className="bi bi-pencil-square"></i>
            </button>
          </div>

          {/* Search existing conversations */}
          <div className="chat-search-wrap">
            <i className="bi bi-search chat-search-icon"></i>
            <input
              className="chat-search-input"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="conv-list">
            {showNewChat ? (
              <>
                <div className="new-chat-header">
                  <button className="btn-back" onClick={() => setShowNewChat(false)}>
                    <i className="bi bi-arrow-left"></i>
                  </button>
                  <span>New Conversation</span>
                </div>
                <div className="chat-search-wrap" style={{ margin: '0 12px 8px' }}>
                  <i className="bi bi-search chat-search-icon"></i>
                  <input
                    className="chat-search-input"
                    placeholder="Search users..."
                    autoFocus
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setFilteredUsers(
                        allUsers.filter(u =>
                          u.name?.toLowerCase().includes(e.target.value.toLowerCase()) ||
                          u.email?.toLowerCase().includes(e.target.value.toLowerCase()) ||
                          u.role?.toLowerCase().includes(e.target.value.toLowerCase())
                        )
                      );
                    }}
                  />
                </div>
                {filteredUsers.map(u => (
                  <div key={u.id} className="conv-item" onClick={() => startNewChat(u)}>
                    <Avatar name={u.name} photo={u.photo} />
                    <div className="conv-info">
                      <div className="conv-name">
                        {u.name}
                        <span className={`role-badge ${u.badgeClass}`}>{u.role}</span>
                      </div>
                      <div className="conv-last-msg">{u.email}</div>
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="conv-empty">No users found</div>
                )}
              </>
            ) : (
              <>
                {conversations
                  .filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(conv => (
                    <div
                      key={conv.userId}
                      className={`conv-item ${activeConv?.userId === conv.userId ? 'active' : ''}`}
                      onClick={() => openConversation(conv)}
                    >
                      <Avatar name={conv.name} photo={conv.photo} />
                      <div className="conv-info">
                        <div className="conv-name">
                          {conv.name}
                          <span className="conv-time">{formatTime(conv.ts || conv.lastMsg.sent_at || conv.lastMsg.created_at)}</span>
                        </div>
                        <div className="conv-last-msg">
                          {conv.lastMsg.sender_id === user.id ? 'You: ' : ''}
                          {(conv.lastMsg.content || '').substring(0, 45)}{(conv.lastMsg.content || '').length > 45 ? '…' : ''}
                        </div>
                      </div>
                      {conv.unread > 0 && <span className="conv-unread">{conv.unread}</span>}
                    </div>
                  ))}
                {conversations.length === 0 && (
                  <div className="conv-empty">
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💬</div>
                    No conversations yet.<br />
                    <button className="btn-start-chat" onClick={() => { setShowNewChat(true); setFilteredUsers(allUsers); }}>
                      Start a conversation
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ─── Right Panel: Chat View ─── */}
        <div className="chat-main">
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <Avatar name={activeConv.name} photo={activeConv.photo} size="lg" />
                <div className="chat-header-info">
                  <div className="chat-header-name">{activeConv.name}</div>
                  <div className="chat-header-sub">{activeConv.email}</div>
                </div>
                {activeConv.role === 'Company' && activeConv.companyTableId && (
                  <button className="chat-header-profile-btn" onClick={() => navigate(`/companies/${activeConv.companyTableId}`)}>
                    <i className="bi bi-building"></i>
                    <span>View Company</span>
                  </button>
                )}
                {activeConv.role === 'Student' && activeConv.studentTableId && (
                  <button className="chat-header-profile-btn" onClick={() => navigate(`/students/${activeConv.studentTableId}`)}>
                    <i className="bi bi-person-circle"></i>
                    <span>View Profile</span>
                  </button>
                )}
              </div>

              {/* Messages Area */}
              <div className="chat-messages-area">
                {chatMessages.length === 0 ? (
                  <div className="chat-empty">
                    <div style={{ fontSize: '3rem' }}>👋</div>
                    <p>Say hello to <strong>{activeConv.name}</strong>!</p>
                  </div>
                ) : (
                  <>
                    {chatMessages.map((msg, idx) => {
                      const isMine = msg.sender_id === user.id;
                      const prevMsg = chatMessages[idx - 1];
                      const msgDate = new Date(msg.sent_at || msg.created_at);
                      const prevDate = prevMsg ? new Date(prevMsg.sent_at || prevMsg.created_at) : null;
                      const showDate = !prevMsg || (prevDate && msgDate.toDateString() !== prevDate.toDateString());
                      return (
                        <React.Fragment key={msg.id}>
                          {showDate && (
                            <div className="date-divider">
                              <span>{formatDateDivider(msg.sent_at || msg.created_at)}</span>
                            </div>
                          )}
                          <div className={`chat-bubble-row ${isMine ? 'mine' : 'theirs'}`}>
                            {!isMine && (
                              <div className="bubble-avatar">
                                <Avatar name={activeConv.name} photo={activeConv.photo} size="sm" />
                              </div>
                            )}
                            <div className="bubble-wrapper">
                              {isMine && (
                                <button
                                  className="btn-delete-msg"
                                  title="ลบข้อความ"
                                  onClick={() => handleDeleteMessage(msg.id)}
                                >
                                  <i className="bi bi-trash3"></i>
                                </button>
                              )}
                              <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
                                {msg.content}
                                <span className="bubble-time">{formatTime(msg.sent_at || msg.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input Bar */}
              <div className="chat-input-area">
                <textarea
                  ref={textareaRef}
                  className="chat-textarea"
                  rows={1}
                  placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  className="btn-send"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                >
                  {sending
                    ? <span className="spinner-border spinner-border-sm" />
                    : <i className="bi bi-send-fill"></i>}
                </button>
              </div>
            </>
          ) : (
            <div className="chat-placeholder">
              <div className="chat-placeholder-icon">
                <i className="bi bi-chat-text"></i>
              </div>
              <h5>Your messages</h5>
              <p>Select a conversation or start a new one to begin chatting.</p>
              <button
                className="btn-placeholder-new"
                onClick={() => { setShowNewChat(true); setFilteredUsers(allUsers); }}
              >
                <i className="bi bi-plus-lg"></i> New Conversation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Delete Confirm Modal ─── */}
      {confirmDelete !== null && (
        <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">🗑️</div>
            <h6 className="confirm-title">Delete Message</h6>
            <p className="confirm-desc">This message will be permanently deleted. Are you sure?</p>
            <div className="confirm-actions">
              <button className="confirm-btn-cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="confirm-btn-delete" onClick={confirmDeleteAction}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
