/**
 * Reminder Model
 * Mongoose schema for reminders with validation, indexes, and methods.
 */

const mongoose = require('mongoose');
const { REMINDER_STATUS, REMINDER_PRIORITY, REMINDER_CATEGORY } = require('@nudge/shared');

const reminderSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
    trim: true
  },
  description: {
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
    trim: true,
    default: ''
  },
  category: {
    type: String,
    enum: {
      values: Object.values(REMINDER_CATEGORY),
      message: 'Invalid category'
    },
    default: REMINDER_CATEGORY.OTHER,
    index: true
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required'],
    index: true
  },
  timezone: {
    type: String,
    trim: true,
    default: 'UTC',
    validate: {
      validator: function(v) {
        if (!v) return true;
        try {
          Intl.DateTimeFormat(undefined, { timeZone: v });
          return true;
        } catch {
          return false;
        }
      },
      message: 'Invalid timezone identifier'
    }
  },
  priority: {
    type: String,
    enum: {
      values: Object.values(REMINDER_PRIORITY),
      message: 'Invalid priority'
    },
    default: REMINDER_PRIORITY.MEDIUM,
    index: true
  },
  status: {
    type: String,
    enum: {
      values: Object.values(REMINDER_STATUS),
      message: 'Invalid status'
    },
    default: REMINDER_STATUS.PENDING,
    index: true
  }
}, {
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      return ret;
    }
  }
});

// Compound indexes for common query patterns
reminderSchema.index({ status: 1, dueDate: 1 });
reminderSchema.index({ status: 1, priority: 1, dueDate: 1 });
reminderSchema.index({ createdAt: -1 });

// Virtual for checking if reminder is overdue
reminderSchema.virtual('isOverdue').get(function() {
  return this.status === REMINDER_STATUS.PENDING && this.dueDate < new Date();
});

// Virtual for time until due (in milliseconds)
reminderSchema.virtual('timeUntilDue').get(function() {
  return this.dueDate.getTime() - Date.now();
});

// Virtual for priority rank (for proper sorting: high=3, medium=2, low=1)
reminderSchema.virtual('priorityRank').get(function() {
  const ranks = {
    [REMINDER_PRIORITY.HIGH]: 3,
    [REMINDER_PRIORITY.MEDIUM]: 2,
    [REMINDER_PRIORITY.LOW]: 1
  };
  return ranks[this.priority] || 0;
});

// Instance method to mark as completed
reminderSchema.methods.markCompleted = function() {
  this.status = REMINDER_STATUS.COMPLETED;
  return this.save();
};

// Instance method to cancel
reminderSchema.methods.cancel = function() {
  this.status = REMINDER_STATUS.CANCELLED;
  return this.save();
};

// Instance method to reschedule
reminderSchema.methods.reschedule = function(newDueDate, newTimezone) {
  this.dueDate = newDueDate;
  if (newTimezone) this.timezone = newTimezone;
  this.status = REMINDER_STATUS.PENDING; // Reset to pending when rescheduled
  return this.save();
};

// Static method to find pending reminders due before a certain time
reminderSchema.statics.findDueReminders = function(beforeDate = new Date()) {
  return this.find({
    status: REMINDER_STATUS.PENDING,
    dueDate: { $lte: beforeDate }
  }).sort({ dueDate: 1 });
};

// Static method to find upcoming reminders
reminderSchema.statics.findUpcoming = function(limit = 50) {
  return this.find({
    status: REMINDER_STATUS.PENDING,
    dueDate: { $gte: new Date() }
  }).sort({ dueDate: 1 }).limit(limit);
};

// Static method to find overdue reminders
reminderSchema.statics.findOverdue = function() {
  return this.find({
    status: REMINDER_STATUS.PENDING,
    dueDate: { $lt: new Date() }
  }).sort({ dueDate: 1 });
};

const Reminder = mongoose.models.Reminder || mongoose.model('Reminder', reminderSchema);

module.exports = Reminder;