---
description: Autonomous development workflow for Instagram Swarm Distribution System
---

# Autonomous Development Workflow

This workflow enables continuous, autonomous development of the Instagram Swarm Distribution System without user interaction.

## Priority Order
// turbo-all

### Phase 1: Environment Validation (ALWAYS RUN FIRST)
1. Check if Docker is running
```powershell
docker ps
```

2. Verify backend dependencies are installed
```powershell
cd c:\Users\Saad\Desktop\Instagram Distribution\InstaDistro-Backend
npm install
```

3. Check TypeScript compilation
```powershell
cd c:\Users\Saad\Desktop\Instagram Distribution\InstaDistro-Backend
npx tsc --noEmit
```

### Phase 2: Read Current State
1. Read `DEVELOPMENT_STATE.md` to understand current progress
2. Read `TODO_NEXT_PHASE.md` to understand what's pending
3. Check for any `CURRENT_TASK.md` file for in-progress work

### Phase 3: Execute Next Task
1. Pick the next incomplete task from the priority list
2. Implement the feature following the patterns in existing code
3. Update `DEVELOPMENT_STATE.md` with progress
4. Run TypeScript check after each file change
5. Update `CHANGELOG.md` with what was done

### Phase 4: Validate Changes
1. Run TypeScript compilation
```powershell
cd c:\Users\Saad\Desktop\Instagram Distribution\InstaDistro-Backend
npm run build
```

2. Test the API if backend changes were made
```powershell
curl http://localhost:3000/health
```

### Phase 5: Commit Progress
1. Stage changes
```powershell
cd c:\Users\Saad\Desktop\Instagram Distribution
git add .
```

2. Commit with descriptive message
```powershell
git commit -m "feat: [description of what was implemented]"
```

### Phase 6: Continue to Next Task
1. Update task status in `DEVELOPMENT_STATE.md`
2. Move to next task in priority order
3. Repeat from Phase 3

## Error Handling
- If TypeScript errors occur, fix them before proceeding
- If a task seems unclear, check the detailed task files in `.agent/tasks/`
- Log all progress to `DEVELOPMENT_LOG.md`

## Task Priority (Execute in Order)
1. Complete Phase 2.3: Basic Posting Functionality
2. Complete Phase 2.4: Error Handling & Rate Limits
3. Complete Phase 3: Warmup Automation
4. Complete Phase 4: Content Variation Engine
5. Complete Phase 5: Smart Distribution Engine
6. Complete Phase 6: Account Groups
7. Complete Phase 7: Health Monitoring
8. Complete Phase 8: Proxy Management
9. Complete Phase 9: Advanced Scheduling
10. Complete Phase 10: Production Polish
