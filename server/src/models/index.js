/**
 * Models Index
 * Exports all Mongoose models for the server.
 */

const Reminder = require('./Reminder');
const NotificationLog = require('./NotificationLog');

module.exports = {
  Reminder,
  NotificationLog
};