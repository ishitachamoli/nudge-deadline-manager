# Nudge Contribution Guide

## Table of Contents
1. [Git Workflow](#git-workflow)
2. [Branch Naming](#branch-naming)
3. [Commit Conventions](#commit-conventions)
4. [Pull Request Requirements](#pull-request-requirements)
5. [Code Review Process](#code-review-process)
6. [Folder Ownership](#folder-ownership)
7. [Integration Rules](#integration-rules)
8. [Development Setup](#development-setup)
9. [Testing Guidelines](#testing-guidelines)
10. [Issue Tracking](#issue-tracking)

---

## Git Workflow

### Main Branches
- **`main`** - Protected branch, production-ready code only
- **Feature branches** - Created from `main`, merged via PR

### Branch Protection Rules (main)
- Require PR review (1 approval minimum)
- Require status checks to pass (lint, tests, build)
- Require linear history (squash merge)
- No force pushes
- No direct commits

### Workflow Steps
1. Create feature branch from `main`
2. Implement changes with atomic commits
3. Run local tests and linting
4. Push branch and open PR
5. Address review feedback
6. Squash merge to `main` after approval
7. Delete feature branch

---

## Branch Naming

Format: `<type>/<module>-<short-description>`

### Types
| Prefix | Purpose |
|--------|---------|
| `feat/` | New feature |
| `fix/` | Bug fix |
| `refactor/` | Code restructuring |
| `docs/` | Documentation only |
| `test/` | Test additions/changes |
| `chore/` | Maintenance, deps, config |
| `perf/` | Performance improvement |

### Module Identifiers
| Module | Identifier |
|--------|------------|
| Frontend (Client) | `client` or `ui` |
| Backend (Server) | `api` or `server` |
| Database | `db` or `models` |
| Scheduler | `scheduler` or `jobs` |
| Shared Contracts | `shared` |
| Cross-cutting | `core` or `infra` |

### Examples
```
feat/api-reminder-crud
fix/scheduler-retry-logic
refactor/db-indexes
docs/architecture-update
test/api-integration
chore/deps-update
feat/client-dashboard-filters
```

---

## Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting, no code change |
| `refactor` | Code restructuring |
| `perf` | Performance |
| `test` | Tests |
| `chore` | Maintenance |
| `build` | Build system |
| `ci` | CI configuration |

### Scopes
Use module identifiers: `api`, `client`, `db`, `scheduler`, `shared`, `infra`

### Examples
```
feat(api): add reminder completion endpoint
fix(scheduler): handle timezone in due date comparison
docs(shared): update API contract constants
refactor(db): add compound indexes for reminder queries
test(api): add integration tests for reminder CRUD
chore(infra): update eslint config for all workspaces
```

### Commit Message Guidelines
- **Subject line**: ≤ 50 chars, imperative mood ("add" not "adds")
- **Body**: Explain *what* and *why*, not *how* (code shows how)
- **Footer**: Reference issues (`Closes #123`), breaking changes (`BREAKING CHANGE:`)

---

## Pull Request Requirements

### PR Template
```markdown
## Description
Brief summary of changes

## Type
- [ ] Feature
- [ ] Bug Fix
- [ ] Refactor
- [ ] Documentation
- [ ] Test

## Related Issues
Closes #XXX

## Changes
- Change 1
- Change 2

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing done (describe)

## Checklist
- [ ] Code follows style guide
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console.log/debugger left
- [ ] Breaking changes documented
```

### Required Checks (must pass before merge)
1. **Lint**: `npm run lint` (all workspaces)
2. **Type Check**: `npm run typecheck` (if TypeScript)
3. **Tests**: `npm test` (all workspaces)
4. **Build**: `npm run build` (client, shared)
5. **No merge conflicts**

### PR Size Guidelines
- **Small**: < 200 lines changed (preferred)
- **Medium**: 200-500 lines (needs extra review)
- **Large**: > 500 lines (split into multiple PRs)

---

## Code Review Process

### Reviewer Responsibilities
1. **Functionality**: Does it solve the problem correctly?
2. **Architecture**: Fits module boundaries? No circular deps?
3. **Security**: No secrets, proper validation, no injection risks?
4. **Performance**: N+1 queries? Unnecessary re-renders? Efficient queries?
5. **Maintainability**: Clear naming? Adequate comments? Testable?
6. **Contracts**: Shared types updated? API changes documented?

### Review Timeline
- Initial review: Within 24 hours
- Follow-up reviews: Within 12 hours
- Urgent fixes: ASAP (tag @team-lead)

### Approval Requirements
- **1 approval** for feature/fix/refactor
- **2 approvals** for:
  - Database schema changes
  - API contract changes
  - Security-related changes
  - Scheduler logic changes

### Review Comments
- Use GitHub review comments (line-specific)
- Prefix: `nit:` for style, `question:` for clarification, `blocker:` for must-fix
- Resolve conversations before merge

---

## Folder Ownership

### Primary Owners
| Folder | Owner | Can Modify Without Review |
|--------|-------|---------------------------|
| `client/src/**` | Member 2 (Frontend) | UI components, pages, styles |
| `server/src/controllers/**` | Member 1 (Backend) | Controller logic |
| `server/src/services/**` | Member 1 (Backend) | Business logic |
| `server/src/routes/**` | Member 1 (Backend) | Route definitions |
| `server/src/models/**` | Member 3 (Database) | Schemas, indexes, migrations |
| `server/src/middleware/**` | Member 1 (Backend) | Validation, error handling |
| `server/src/config/**` | Member 1 (Backend) | Env, DB config |
| `scheduler/src/**` | Member 4 (Scheduler) | Jobs, workers, services |
| `shared/src/**` | All (coordinated) | Contracts - requires team sync |
| `docs/**` | All | Documentation |

### Shared Ownership (Requires Coordination)
| Area | Coordinators |
|------|--------------|
| API contracts (`shared/src/contracts/`) | Member 1 + Member 2 |
| Database schemas (`server/src/models/`) | Member 1 + Member 3 |
| Scheduler ↔ Server integration | Member 1 + Member 4 |
| Environment config | Member 1 + Member 4 |

### Modification Rules
1. **Own your folder** - You can make changes freely within your folder
2. **Cross-folder changes** - Open discussion in PR or issue first
3. **Shared contracts** - Never modify without team discussion
4. **Breaking changes** - Require 2 approvals + migration plan

---

## Integration Rules

### API Contract Changes
1. Update `shared/src/contracts/api-contracts.js`
2. Update Zod schemas in `server/src/middleware/validate.js`
3. Update TypeScript types (if migrated) or JSDoc
4. Update client API client in `client/src/services/api.js`
5. Document in `docs/api-documentation.md`
6. Tag all affected members in PR

### Database Schema Changes
1. Modify Mongoose model in `server/src/models/`
2. Add/modify indexes as needed
3. Create migration script if data transformation needed
4. Update scheduler models if they duplicate schema
5. Test with existing data
6. Document in `docs/database-design.md`

### Scheduler Integration
1. Server emits events or updates reminder status
2. Scheduler polls for due reminders (current) or consumes from queue (future)
3. Idempotency keys must match: `${reminderId}:${scheduledAt.getTime()}`
4. Notification status transitions: `pending` → `sent` | `failed` → `cancelled`
5. Server cancels pending notifications on reminder update/delete

### Environment Variables
1. Add to `.env.example` with description
2. Update validation in `server/src/config/env.js` and `scheduler/src/config/env.js`
3. Document in `docs/architecture.md`
4. Never commit actual `.env` files

---

## Development Setup

### Prerequisites
- Node.js 18+
- MongoDB 6+ (local or Atlas)
- Git

### Initial Setup
```bash
# Clone repository
git clone <repo-url>
cd nudge

# Install all dependencies
npm run install:all

# Copy environment template
cp .env.example .env

# Edit .env with your MongoDB URI
# MONGODB_URI=mongodb://localhost:27017/nudge

# Start development servers
npm run dev:all
```

### Workspace Commands
```bash
# Root
npm run dev              # Client + Server
npm run dev:scheduler    # Scheduler only
npm run dev:all          # All three
npm run install:all      # Install all workspaces

# Client
cd client
npm run dev              # Vite dev server (port 5173)
npm run build            # Production build
npm run preview          # Preview build

# Server
cd server
npm run dev              # Nodemon (port 3000)
npm run start            # Production
npm test                 # Jest tests

# Scheduler
cd scheduler
npm run dev              # Nodemon
npm run start            # Production

# Shared
cd shared
npm run build            # TypeScript compilation (if applicable)
```

### Recommended VS Code Extensions
- ESLint
- Prettier
- MongoDB for VS Code
- REST Client (for API testing)
- GitLens

---

## Testing Guidelines

### Test Organization
```
server/
├── src/
│   └── services/
│       ├── reminder-service.js
│       └── __tests__/
│           └── reminder-service.test.js
└── __tests__/
    ├── integration/
    │   └── reminder-api.test.js
    └── unit/
        └── validation.test.js
```

### Test Types

#### Unit Tests (Fast, Isolated)
- Test pure functions in service layer
- Mock database with in-memory MongoDB or jest mocks
- Target: > 80% coverage for services

#### Integration Tests (Real DB)
- Test API endpoints with supertest
- Use test database (separate from dev)
- Clean up after each test
- Target: Critical paths covered

#### E2E Tests (Manual/CI)
- Full user flows
- Run against staging environment
- Document in `docs/testing.md`

### Running Tests
```bash
# Server tests
cd server
npm test                 # All tests
npm run test:watch       # Watch mode
npm test -- --coverage   # With coverage

# Client tests (when added)
cd client
npm test
```

### Test Data
- Use factories/fixtures for consistent test data
- Never use production data
- Clean up in `afterEach` / `afterAll`

---

## Issue Tracking

### GitHub Issue Template

#### Bug Report
```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: 
- Node: 
- MongoDB: 
- Workspace: (client/server/scheduler/shared)

## Screenshots/Logs
If applicable

## Possible Fix
If you have ideas
```

#### Feature Request
```markdown
## Feature Description
What you want to build

## Problem Statement
Why this is needed

## Proposed Solution
How you think it should work

## Alternatives Considered
Other approaches

## Affected Modules
- [ ] Client
- [ ] Server
- [ ] Database
- [ ] Scheduler
- [ ] Shared

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Dependencies
Blocks / Blocked by other issues
```

### Issue Labels
| Label | Purpose |
|-------|---------|
| `bug` | Something broken |
| `feature` | New functionality |
| `enhancement` | Improvement to existing |
| `docs` | Documentation |
| `good first issue` | Beginner-friendly |
| `help wanted` | Need assistance |
| `priority:high` | Urgent |
| `priority:low` | Nice to have |
| `module:client` | Frontend |
| `module:api` | Backend |
| `module:db` | Database |
| `module:scheduler` | Scheduler |

### Milestones
- **Sprint 1**: Foundation + Core API
- **Sprint 2**: Scheduler + Notifications
- **Sprint 3**: Frontend Integration
- **Sprint 4**: Polish + Testing

---

## Code Style

### JavaScript
- ESLint + Prettier (configured in each workspace)
- 2 spaces indentation
- Single quotes
- Trailing commas
- Semicolons required

### Naming Conventions
| Element | Convention |
|---------|------------|
| Files | kebab-case (`reminder-service.js`) |
| Classes | PascalCase (`ReminderService`) |
| Functions/Variables | camelCase (`createReminder`) |
| Constants | UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`) |
| Private | Prefix with `_` (`_internalMethod`) |

### Import Order
1. Node built-ins
2. External packages
3. Internal (absolute from workspace root via aliases)
4. Relative imports

---

## Release Process

### Versioning
- **Semantic Versioning** (MAJOR.MINOR.PATCH)
- Workspaces version independently
- Root package tracks overall release

### Release Checklist
- [ ] All tests pass
- [ ] Changelog updated
- [ ] Version bumped in package.json
- [ ] Git tag created
- [ ] Deployment triggered

---

## Communication

### Channels
- **GitHub Issues**: Task tracking, bugs, features
- **GitHub PRs**: Code review, design discussions
- **Discord/Slack**: Quick questions, standups
- **Weekly Sync**: Monday 10am (30 min)

### Response Expectations
- Issues: Acknowledge within 24 hours
- PRs: First review within 24 hours
- Urgent: Tag @team-lead, respond ASAP

---

## Onboarding Checklist (New Members)

- [ ] Read this guide
- [ ] Read `docs/architecture.md`
- [ ] Set up development environment
- [ ] Run `npm run dev:all` successfully
- [ ] Make a test commit to verify workflow
- [ ] Review open issues in your module
- [ ] Pair with module owner for first task

---

## Emergency Procedures

### Hotfix Process
1. Create `hotfix/<description>` branch from `main`
2. Fix with minimal changes
3. Fast-track review (1 approval, team lead)
4. Merge to `main`
5. Tag release
6. Cherry-pick to develop if needed

### Rollback
- Revert merge commit on `main`
- Or deploy previous tag
- Communicate in #incidents channel

---

*Last updated: 2026-11-12*
*Version: 1.0*
*Maintainer: Team Lead (Member 1)*