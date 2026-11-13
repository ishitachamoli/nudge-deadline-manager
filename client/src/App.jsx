import React, { useState, useEffect } from 'react';
import api from './services/api';

/**
 * Main App Component
 * Dashboard with reminder list, create/edit modal, and notification history.
 */

function App() {
  const [reminders, setReminders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    dueDate: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    priority: 'medium'
  });
  const [formErrors, setFormErrors] = useState({});

  // Fetch reminders on mount
  useEffect(() => {
    fetchReminders();
    fetchNotifications();
  }, []);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const data = await api.reminders.list();
      setReminders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const data = await api.notifications.list();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    // Validation
    const errors = {};
    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.dueDate) errors.dueDate = 'Due date is required';
    if (errors.title || errors.dueDate) {
      setFormErrors(errors);
      return;
    }

    try {
      setLoading(true);
      if (editingReminder) {
        await api.reminders.update(editingReminder.id, formData);
      } else {
        await api.reminders.create(formData);
      }
      closeModal();
      fetchReminders();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingReminder(null);
    setFormData({
      title: '',
      description: '',
      category: 'other',
      dueDate: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      priority: 'medium'
    });
    setShowModal(true);
  };

  const openEditModal = (reminder) => {
    setEditingReminder(reminder);
    setFormData({
      title: reminder.title,
      description: reminder.description || '',
      category: reminder.category,
      dueDate: new Date(reminder.dueDate).toISOString().slice(0, 16),
      timezone: reminder.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      priority: reminder.priority
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingReminder(null);
    setFormErrors({});
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) return;
    try {
      await api.reminders.delete(id);
      fetchReminders();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleComplete = async (id) => {
    try {
      await api.reminders.complete(id);
      fetchReminders();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-warning',
      completed: 'badge-success',
      cancelled: 'badge-gray'
    };
    return badges[status] || 'badge-gray';
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      low: 'badge-gray',
      medium: 'badge-primary',
      high: 'badge-danger'
    };
    return badges[priority] || 'badge-gray';
  };

  // Filter reminders
  const pendingReminders = reminders.filter(r => r.status === 'pending');
  const completedReminders = reminders.filter(r => r.status === 'completed');
  const overdueReminders = pendingReminders.filter(r => new Date(r.dueDate) < new Date());

  if (loading && reminders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="spinner"></div>
        <p className="mt-2 text-gray-500">Loading reminders...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container flex items-center justify-between h-16">
          <h1 className="text-xl font-semibold text-gray-900">Nudge</h1>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Reminder
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-6">
        {/* Error Toast */}
        {error && (
          <div className="alert alert-error mb-4 flex items-center justify-between">
            <span>{error}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card">
            <div className="card-body">
              <p className="text-sm text-gray-500">Total Reminders</p>
              <p className="text-3xl font-semibold text-gray-900">{reminders.length}</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-3xl font-semibold text-gray-900">{pendingReminders.length}</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <p className="text-sm text-gray-500">Overdue</p>
              <p className="text-3xl font-semibold text-danger">{overdueReminders.length}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 border-b border-gray-200">
          <nav className="flex gap-4" aria-label="Reminder filters">
            <button className="px-3 py-2 text-sm font-medium text-primary border-b-2 border-primary">
              Upcoming ({pendingReminders.filter(r => new Date(r.dueDate) >= new Date()).length})
            </button>
            <button className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-900">
              Overdue ({overdueReminders.length})
            </button>
            <button className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-900">
              Completed ({completedReminders.length})
            </button>
          </nav>
        </div>

        {/* Upcoming Reminders */}
        <section className="card mb-6">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Upcoming Reminders</h2>
          </div>
          <div className="card-body">
            {pendingReminders.length === 0 ? (
              <div className="empty-state">
                <svg className="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="empty-state-title">No upcoming reminders</p>
                <p className="text-sm">Create your first reminder to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Due Date</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingReminders
                      .filter(r => new Date(r.dueDate) >= new Date())
                      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                      .map((reminder) => (
                        <tr key={reminder.id}>
                          <td className="font-medium">{reminder.title}</td>
                          <td>
                            <span className="badge badge-primary">{reminder.category}</span>
                          </td>
                          <td>{formatDate(reminder.dueDate)}</td>
                          <td>
                            <span className={getPriorityBadge(reminder.priority)}>
                              {reminder.priority}
                            </span>
                          </td>
                          <td>
                            <span className={getStatusBadge(reminder.status)}>
                              {reminder.status}
                            </span>
                          </td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => openEditModal(reminder)}
                                aria-label="Edit reminder"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleComplete(reminder.id)}
                                aria-label="Mark complete"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                className="btn btn-ghost btn-sm text-danger"
                                onClick={() => handleDelete(reminder.id)}
                                aria-label="Delete reminder"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Overdue Reminders */}
        {overdueReminders.length > 0 && (
          <section className="card mb-6">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-danger">Overdue Reminders</h2>
            </div>
            <div className="card-body">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Due Date</th>
                      <th>Priority</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueReminders
                      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                      .map((reminder) => (
                        <tr key={reminder.id} className="bg-danger-light/50">
                          <td className="font-medium">{reminder.title}</td>
                          <td>
                            <span className="badge badge-primary">{reminder.category}</span>
                          </td>
                          <td className="text-danger">{formatDate(reminder.dueDate)}</td>
                          <td>
                            <span className={getPriorityBadge(reminder.priority)}>
                              {reminder.priority}
                            </span>
                          </td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => openEditModal(reminder)}
                              >
                                Reschedule
                              </button>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleComplete(reminder.id)}
                              >
                                Complete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Completed Reminders */}
        {completedReminders.length > 0 && (
          <section className="card mb-6">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Completed Reminders</h2>
            </div>
            <div className="card-body">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Due Date</th>
                      <th>Completed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedReminders
                      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                      .map((reminder) => (
                        <tr key={reminder.id}>
                          <td>{reminder.title}</td>
                          <td><span className="badge badge-primary">{reminder.category}</span></td>
                          <td>{formatDate(reminder.dueDate)}</td>
                          <td>{formatDate(reminder.updatedAt)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Notification History */}
        <section className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold">Notification History</h2>
            <button className="btn btn-ghost btn-sm" onClick={fetchNotifications}>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
          <div className="card-body">
            {notifications.length === 0 ? (
              <div className="empty-state">
                <svg className="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="empty-state-title">No notifications yet</p>
                <p className="text-sm">Notifications will appear here when reminders are due</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Reminder</th>
                      <th>Scheduled</th>
                      <th>Attempted</th>
                      <th>Status</th>
                      <th>Attempts</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifications
                      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                      .slice(0, 50)
                      .map((notification) => (
                        <tr key={notification.id}>
                          <td className="font-medium max-w-xs truncate" title={notification.reminderId?.title || notification.reminderId}>
                            {notification.reminderId?.title || notification.reminderId}
                          </td>
                          <td>{formatDate(notification.scheduledAt)}</td>
                          <td>{notification.attemptedAt ? formatDate(notification.attemptedAt) : '-'}</td>
                          <td>
                            <span className={getStatusBadge(notification.status)}>
                              {notification.status}
                            </span>
                          </td>
                          <td>{notification.attemptCount}</td>
                          <td className="text-sm text-gray-500 max-w-xs truncate" title={notification.errorMessage}>
                            {notification.errorMessage || '-'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <h2 className="text-lg font-semibold">
                {editingReminder ? 'Edit Reminder' : 'Create Reminder'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="card-body">
              <div className="form-group">
                <label htmlFor="title" className="label">Title *</label>
                <input
                  type="text"
                  id="title"
                  className={`input ${formErrors.title ? 'border-danger' : ''}`}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter reminder title"
                  maxLength={200}
                  autoFocus
                />
                {formErrors.title && <p className="form-error">{formErrors.title}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="description" className="label">Description</label>
                <textarea
                  id="description"
                  className="input textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  maxLength={2000}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label htmlFor="category" className="label">Category</label>
                  <select
                    id="category"
                    className="input select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="personal">Personal</option>
                    <option value="work">Work</option>
                    <option value="study">Study</option>
                    <option value="health">Health</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="priority" className="label">Priority</label>
                  <select
                    id="priority"
                    className="input select"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="dueDate" className="label">Due Date & Time *</label>
                <input
                  type="datetime-local"
                  id="dueDate"
                  className={`input ${formErrors.dueDate ? 'border-danger' : ''}`}
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
                {formErrors.dueDate && <p className="form-error">{formErrors.dueDate}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="timezone" className="label">Timezone</label>
                <input
                  type="text"
                  id="timezone"
                  className="input"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  placeholder="IANA timezone (e.g., America/New_York)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used for display. Stored dates are in UTC.
                </p>
              </div>

              <div className="card-footer flex justify-end gap-3">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Saving...
                    </>
                  ) : (
                    editingReminder ? 'Update' : 'Create'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;