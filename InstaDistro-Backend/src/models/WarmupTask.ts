/**
 * Warmup Task Model
 *
 * Represents automated warmup tasks for new Instagram accounts
 * following a 14-day progressive engagement protocol
 */

export type TaskType = 'follow' | 'like' | 'comment' | 'story' | 'post' | 'watch_story';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface WarmupTask {
  id: string;
  account_id: string;

  // Schedule
  day: number; // Day in warmup (1-14)
  task_type: TaskType;
  target_count: number; // How many actions to perform
  completed_count: number; // How many completed

  // Execution
  status: TaskStatus;
  scheduled_time: string; // ISO timestamp
  completed_at?: string;
  error_message?: string;

  // Metadata
  created_at: string;
}

export interface CreateWarmupTaskInput {
  account_id: string;
  day: number;
  task_type: TaskType;
  target_count: number;
  scheduled_time: string;
}

export interface UpdateWarmupTaskInput {
  completed_count?: number;
  status?: TaskStatus;
  completed_at?: string;
  error_message?: string;
}

/**
 * Warmup Protocol Configuration
 * Defines the 14-day aggressive warmup strategy
 */
export interface WarmupDayProtocol {
  day: number;
  tasks: {
    type: TaskType;
    minCount: number;
    maxCount: number;
    description: string;
  }[];
  description: string;
}

/**
 * 14-Day Warmup Protocol
 * Progressive engagement to avoid Instagram detection
 */
export const WARMUP_PROTOCOL: WarmupDayProtocol[] = [
  // Days 1-2: Account Setup
  {
    day: 1,
    description: 'Account setup and initial profile completion',
    tasks: [
      { type: 'follow', minCount: 5, maxCount: 10, description: 'Follow accounts in niche' },
      { type: 'like', minCount: 10, maxCount: 15, description: 'Like posts from followed accounts' },
      { type: 'watch_story', minCount: 5, maxCount: 10, description: 'Watch stories' },
    ],
  },
  {
    day: 2,
    description: 'Continue light engagement',
    tasks: [
      { type: 'follow', minCount: 5, maxCount: 10, description: 'Follow more accounts' },
      { type: 'like', minCount: 10, maxCount: 15, description: 'Like posts' },
      { type: 'watch_story', minCount: 5, maxCount: 10, description: 'Watch stories' },
    ],
  },

  // Days 3-4: Light Activity
  {
    day: 3,
    description: 'Increase engagement, add comments',
    tasks: [
      { type: 'follow', minCount: 10, maxCount: 20, description: 'Follow accounts' },
      { type: 'like', minCount: 20, maxCount: 30, description: 'Like posts' },
      { type: 'comment', minCount: 2, maxCount: 3, description: 'Comment on posts (short, generic)' },
      { type: 'watch_story', minCount: 10, maxCount: 15, description: 'Watch stories' },
      { type: 'story', minCount: 1, maxCount: 1, description: 'Post a story (not feed post yet)' },
    ],
  },
  {
    day: 4,
    description: 'Continue light activity pattern',
    tasks: [
      { type: 'follow', minCount: 10, maxCount: 20, description: 'Follow accounts' },
      { type: 'like', minCount: 20, maxCount: 30, description: 'Like posts' },
      { type: 'comment', minCount: 2, maxCount: 3, description: 'Comment on posts' },
      { type: 'watch_story', minCount: 10, maxCount: 15, description: 'Watch stories' },
      { type: 'story', minCount: 1, maxCount: 1, description: 'Post a story' },
    ],
  },

  // Days 5-7: Increase Engagement
  {
    day: 5,
    description: 'Increase engagement levels',
    tasks: [
      { type: 'follow', minCount: 20, maxCount: 30, description: 'Follow accounts' },
      { type: 'like', minCount: 30, maxCount: 50, description: 'Like posts' },
      { type: 'comment', minCount: 5, maxCount: 10, description: 'Comment on posts' },
      { type: 'watch_story', minCount: 20, maxCount: 30, description: 'Watch stories' },
      { type: 'story', minCount: 2, maxCount: 3, description: 'Post stories' },
    ],
  },
  {
    day: 6,
    description: 'Continue increased engagement',
    tasks: [
      { type: 'follow', minCount: 20, maxCount: 30, description: 'Follow accounts' },
      { type: 'like', minCount: 30, maxCount: 50, description: 'Like posts' },
      { type: 'comment', minCount: 5, maxCount: 10, description: 'Comment on posts' },
      { type: 'watch_story', minCount: 20, maxCount: 30, description: 'Watch stories' },
      { type: 'story', minCount: 2, maxCount: 3, description: 'Post stories' },
    ],
  },
  {
    day: 7,
    description: 'FIRST FEED POST - Major milestone',
    tasks: [
      { type: 'follow', minCount: 20, maxCount: 30, description: 'Follow accounts' },
      { type: 'like', minCount: 30, maxCount: 50, description: 'Like posts' },
      { type: 'comment', minCount: 5, maxCount: 10, description: 'Comment on posts' },
      { type: 'watch_story', minCount: 20, maxCount: 30, description: 'Watch stories' },
      { type: 'post', minCount: 1, maxCount: 1, description: '🎉 FIRST FEED POST' },
      { type: 'story', minCount: 2, maxCount: 3, description: 'Post stories' },
    ],
  },

  // Days 8-10: First Posting Phase
  {
    day: 8,
    description: 'Posting phase begins',
    tasks: [
      { type: 'follow', minCount: 20, maxCount: 30, description: 'Follow accounts' },
      { type: 'like', minCount: 30, maxCount: 50, description: 'Like posts' },
      { type: 'comment', minCount: 5, maxCount: 10, description: 'Comment on posts' },
      { type: 'watch_story', minCount: 20, maxCount: 30, description: 'Watch stories' },
      { type: 'post', minCount: 1, maxCount: 1, description: 'Feed post' },
      { type: 'story', minCount: 3, maxCount: 4, description: 'Post stories' },
    ],
  },
  {
    day: 9,
    description: 'Continue posting phase',
    tasks: [
      { type: 'follow', minCount: 20, maxCount: 30, description: 'Follow accounts' },
      { type: 'like', minCount: 30, maxCount: 50, description: 'Like posts' },
      { type: 'comment', minCount: 5, maxCount: 10, description: 'Comment on posts' },
      { type: 'watch_story', minCount: 20, maxCount: 30, description: 'Watch stories' },
      { type: 'post', minCount: 1, maxCount: 1, description: 'Feed post' },
      { type: 'story', minCount: 3, maxCount: 4, description: 'Post stories' },
    ],
  },
  {
    day: 10,
    description: 'Maintain posting consistency',
    tasks: [
      { type: 'follow', minCount: 20, maxCount: 30, description: 'Follow accounts' },
      { type: 'like', minCount: 30, maxCount: 50, description: 'Like posts' },
      { type: 'comment', minCount: 5, maxCount: 10, description: 'Comment on posts' },
      { type: 'watch_story', minCount: 20, maxCount: 30, description: 'Watch stories' },
      { type: 'post', minCount: 1, maxCount: 1, description: 'Feed post' },
      { type: 'story', minCount: 3, maxCount: 4, description: 'Post stories' },
    ],
  },

  // Days 11-14: Scale Up
  {
    day: 11,
    description: 'Scale up posting frequency',
    tasks: [
      { type: 'follow', minCount: 20, maxCount: 30, description: 'Follow accounts' },
      { type: 'like', minCount: 40, maxCount: 60, description: 'Like posts' },
      { type: 'comment', minCount: 8, maxCount: 15, description: 'Comment on posts' },
      { type: 'watch_story', minCount: 25, maxCount: 35, description: 'Watch stories' },
      { type: 'post', minCount: 2, maxCount: 3, description: 'Feed posts' },
      { type: 'story', minCount: 4, maxCount: 5, description: 'Post stories' },
    ],
  },
  {
    day: 12,
    description: 'Continue scaled up activity',
    tasks: [
      { type: 'follow', minCount: 20, maxCount: 30, description: 'Follow accounts' },
      { type: 'like', minCount: 40, maxCount: 60, description: 'Like posts' },
      { type: 'comment', minCount: 8, maxCount: 15, description: 'Comment on posts' },
      { type: 'watch_story', minCount: 25, maxCount: 35, description: 'Watch stories' },
      { type: 'post', minCount: 2, maxCount: 3, description: 'Feed posts' },
      { type: 'story', minCount: 4, maxCount: 5, description: 'Post stories' },
    ],
  },
  {
    day: 13,
    description: 'Near full activity level',
    tasks: [
      { type: 'follow', minCount: 25, maxCount: 35, description: 'Follow accounts' },
      { type: 'like', minCount: 50, maxCount: 70, description: 'Like posts' },
      { type: 'comment', minCount: 10, maxCount: 20, description: 'Comment on posts' },
      { type: 'watch_story', minCount: 30, maxCount: 40, description: 'Watch stories' },
      { type: 'post', minCount: 2, maxCount: 3, description: 'Feed posts' },
      { type: 'story', minCount: 4, maxCount: 5, description: 'Post stories' },
    ],
  },
  {
    day: 14,
    description: 'Final warmup day - transition to ACTIVE next',
    tasks: [
      { type: 'follow', minCount: 25, maxCount: 35, description: 'Follow accounts' },
      { type: 'like', minCount: 50, maxCount: 70, description: 'Like posts' },
      { type: 'comment', minCount: 10, maxCount: 20, description: 'Comment on posts' },
      { type: 'watch_story', minCount: 30, maxCount: 40, description: 'Watch stories' },
      { type: 'post', minCount: 3, maxCount: 3, description: 'Feed posts' },
      { type: 'story', minCount: 5, maxCount: 5, description: 'Post stories' },
    ],
  },
];

/**
 * Get warmup protocol for specific day
 */
export function getWarmupProtocolForDay(day: number): WarmupDayProtocol | null {
  return WARMUP_PROTOCOL.find(p => p.day === day) || null;
}

/**
 * Get all warmup days
 */
export function getAllWarmupDays(): WarmupDayProtocol[] {
  return WARMUP_PROTOCOL;
}

/**
 * Calculate warmup progress percentage
 */
export function calculateWarmupProgress(currentDay: number): number {
  const totalDays = 14;
  return Math.min(100, Math.round((currentDay / totalDays) * 100));
}

/**
 * Get next warmup day
 */
export function getNextWarmupDay(currentDay: number): number {
  return currentDay < 14 ? currentDay + 1 : 14;
}

/**
 * Check if warmup is complete
 */
export function isWarmupComplete(currentDay: number): boolean {
  return currentDay >= 14;
}
