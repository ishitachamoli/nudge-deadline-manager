/**
 * NotificationLog Model
 * Mongoose schema for notification delivery logs with idempotency and retry support.
 */

const mongoose = require('mongoose');
const { NOTIFICATION_STATUS } = require('@nudge/shared');

const notificationLogSchema = new mongoose.Schema({
  reminderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reminder',
    required: [true, 'Reminder ID is required'],
    index: true
  },
  scheduledAt: {
    type: Date,
    required: [true, 'Scheduled time is required'],
    index: true
  },
  attemptedAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: {
      values: Object.values(NOTIFICATION_STATUS),
      message: 'Invalid notification status'
    },
    default: NOTIFICATION_STATUS.PENDING,
    index: true
  },
  attemptCount: {
    type: Number,
    default: 0,
    min: 0
  },
  idempotencyKey: {
    type: String,
    required: [true, 'Idempotency key is required'],
    unique: true,
    index: true,
    maxlength: 256
  },
  errorMessage: {
    type: String,
    default: null
  },
  nextRetryAt: {
    type: Date,
    default: null,
    index: true
  },
  // Store delivery metadata for debugging
  deliveryMetadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      if (ret.reminderId && ret.reminderId._id) {
        ret.reminderId = ret.reminderId._id.toString();
      }
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      if (ret.reminderId && ret.reminderId._id) {
        ret.reminderId = ret.reminderId._id.toString();
      }
      return ret;
    }
  }
});

// Compound indexes for efficient querying
notificationLogSchema.index({ status: 1, nextRetryAt: 1 });
notificationLogSchema.index({ reminderId: 1, status: 1 });
notificationLogSchema.index({ createdAt: -1 });

// Virtual for checking if notification can be retried
notificationLogSchema.virtual('canRetry').get(function() {
  return this.status === NOTIFICATION_STATUS.FAILED &&
         this.attemptCount < 3 &&
         this.nextRetryAt &&
         this.nextRetryAt <= new Date();
});

// Instance method to mark as sent
notificationLogSchema.methods.markSent = function(metadata = {}) {
  this.status = NOTIFICATION_STATUS.SENT;
  this.attemptedAt = new Date();
  this.errorMessage = null;
  this.nextRetryAt = null;
  this.deliveryMetadata = { ...this.deliveryMetadata, ...metadata };
  return this.save();
};

// Instance method to mark as failed with retry scheduling
notificationLogSchema.methods.markFailed = function(errorMessage, nextRetryAt = null) {
  this.status = NOTIFICATION_STATUS.FAILED;
  this.attemptedAt = new Date();
  this.errorMessage = errorMessage;
  this.nextRetryAt = nextRetryAt;
  return this.save();
};

// Instance method to cancel
notificationLogSchema.methods.cancel = function() {
  this.status = NOTIFICATION_STATUS.CANCELLED;
  this.nextRetryAt = null;
  return this.save();
};

// Instance method to increment attempt count
notificationLogSchema.methods.incrementAttempt = function() {
  this.attemptCount += 1;
  return this.save();
};

// Static method to find pending notifications for a reminder
notificationLogSchema.statics.findPendingForReminder = function(reminderId) {
  return this.find({
    reminderId,
    status: { $in: [NOTIFICATION_STATUS.PENDING, NOTIFICATION_STATUS.FAILED] }
  }).sort({ scheduledAt: 1 });
};

// Static method to find notifications due for retry
notificationLogSchema.statics.findDueForRetry = function(maxAttempts = 3) {
  return this.find({
    status: NOTIFICATION_STATUS.FAILED,
    attemptCount: { $lt: maxAttempts },
    nextRetryAt: { $lte: new Date() }
  }).sort({ nextRetryAt: 1 });
};

// Static method to find stale pending notifications
notificationLogSchema.statics.findStalePending = function(thresholdMs = 5 * 60 * 1000) {
  const threshold = new Date(Date.now() - thresholdMs);
  return this.find({
    status: NOTIFICATION_STATUS.PENDING,
    createdAt: { $lt: threshold }
  });
};

// Static method to create with idempotency protection
notificationLogSchema.statics.createIdempotent = async function(data) {
  try {
    return await this.create(data);
  } catch (error) {
    if (error.code === 11000) { // Duplicate key error
      // Idempotency key already exists - return existing
      return this.findOne({ idempotencyKey: data.idempotencyKey });
    }
    throw error;
  }
};

const NotificationLog = mongoose.models.NotificationLog || mongoose.model('NotificationLog', notificationLogSchema);

module.exports = NotificationLog;