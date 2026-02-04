# Task: Phase 2.3 - Basic Posting Functionality

**Priority:** HIGH
**Estimated Time:** 2-3 days
**Status:** IN PROGRESS

---

## Overview

Implement the core posting functionality that allows posting photos and videos to Instagram accounts through both the Private API (personal accounts) and Graph API (business accounts).

---

## Files to Create/Modify

### New Files:
1. `src/jobs/PostJob.ts` - Bull queue processor for background posting
2. `src/services/instagram/MediaUploader.ts` - Media upload handling
3. `src/types/posting.ts` - TypeScript interfaces for posting

### Files to Modify:
1. `src/api/controllers/PostController.ts` - Add job queue integration
2. `src/api/routes/posts.routes.ts` - Add new endpoints
3. `src/index.ts` - Initialize post job processor

---

## Task Breakdown

### Task 2.3.1: Create Post Job Processor
**File:** `src/jobs/PostJob.ts`

```typescript
// Structure:
- Import Bull and create postQueue
- Define PostJobData interface
- Create processPostJob function
- Handle photo posts
- Handle video posts
- Handle carousel posts (future)
- Update post_results table on completion
- Implement retry logic with exponential backoff
- Add event listeners for monitoring
```

**Acceptance Criteria:**
- [ ] Bull queue initialized with Redis connection
- [ ] Job processor handles photo uploads
- [ ] Job processor handles video uploads
- [ ] Retry logic with max 3 attempts
- [ ] post_results table updated on success/failure
- [ ] Logging for all job events

---

### Task 2.3.2: Create Media Uploader Service
**File:** `src/services/instagram/MediaUploader.ts`

```typescript
// Structure:
- validateMedia(filePath) - Check file type and size
- downloadMedia(url) - Download from URL to temp storage
- processPhoto(filePath) - Resize/optimize for Instagram
- processVideo(filePath) - Validate video requirements
- cleanupTempFiles(filePath) - Remove temp files after upload
```

**Acceptance Criteria:**
- [ ] Photo validation (JPEG, PNG, max 8MB)
- [ ] Video validation (MP4, max 100MB, 60sec)
- [ ] Temp file management
- [ ] Error handling for invalid media

---

### Task 2.3.3: Update Post Controller
**File:** `src/api/controllers/PostController.ts`

Add methods:
- `queuePost(req, res)` - Queue a post for processing
- `getPostStatus(req, res)` - Get status of queued post
- `cancelPost(req, res)` - Cancel a queued post
- `retryPost(req, res)` - Retry a failed post

**Acceptance Criteria:**
- [ ] POST /api/posts/queue endpoint
- [ ] GET /api/posts/:id/status endpoint
- [ ] DELETE /api/posts/:id endpoint
- [ ] POST /api/posts/:id/retry endpoint

---

### Task 2.3.4: Update Frontend
**File:** `src/screens/DistributionScreen.tsx`

Add features:
- Post queue visualization
- Real-time status updates
- Retry failed posts button
- Cancel queued posts button

**Acceptance Criteria:**
- [ ] Queue status display
- [ ] Progress indicators
- [ ] Success/failure notifications
- [ ] Retry/cancel actions

---

## Testing Commands

```bash
# Create a test post
curl -X POST http://localhost:3000/api/posts/queue \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_1" \
  -d '{
    "accountId": "ACCOUNT_ID",
    "mediaPath": "/path/to/image.jpg",
    "mediaType": "photo",
    "caption": "Test post from InstaDistro!"
  }'

# Check post status
curl http://localhost:3000/api/posts/POST_ID/status \
  -H "x-user-id: user_1"
```

---

## Dependencies

- PostingService (exists) - For actual Instagram API calls
- PrivateApiClient (exists) - For personal account posting
- GraphApiClient (exists) - For business account posting
- Bull queue (installed) - For job processing
- Redis (running) - For queue storage

---

## Completion Checklist

- [ ] PostJob.ts created and tested
- [ ] MediaUploader.ts created and tested
- [ ] PostController.ts updated
- [ ] Posts routes updated
- [ ] TypeScript compiles without errors
- [ ] API endpoints tested
- [ ] Frontend updated (optional for this phase)
- [ ] Documentation updated
