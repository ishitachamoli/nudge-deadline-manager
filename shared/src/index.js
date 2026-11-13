/**
 * @nudge/shared - Shared contracts and constants
 *
 * This package provides shared types, constants, and validation schemas
 * for the Nudge application. Used by client, server, and scheduler.
 */

const apiContracts = require('./contracts/api-contracts');

module.exports = {
  ...apiContracts
};