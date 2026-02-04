import { randomInRange } from '../../config/variations';

export interface PostSchedule {
  accountId: string;
  scheduledAt: Date;
  priority: number;
}
export interface SchedulingOptions {
  spreadHours: number;
  minGapMs: number;
  maxGapMs: number;
  peakHours?: { start: number; end: number }[];
}
const DEFAULT_OPTIONS: SchedulingOptions = {
  spreadHours: 6, minGapMs: 120000, maxGapMs: 900000,
  peakHours: [{ start: 6, end: 9 }, { start: 12, end: 14 }, { start: 18, end: 22 }],
};
export class SchedulingAlgorithm {
  private options: SchedulingOptions;
  constructor(options?: Partial<SchedulingOptions>) { this.options = { ...DEFAULT_OPTIONS, ...options }; }
  calculateDistributionSchedule(accountIds: string[], startTime: Date = new Date()): PostSchedule[] {
    const schedule: PostSchedule[] = [];
    let current = startTime.getTime();
    const spreadMs = this.options.spreadHours * 3600000;
    for (const accountId of accountIds) {
      current += randomInRange(this.options.minGapMs, this.options.maxGapMs);
      if (current - startTime.getTime() > spreadMs) current = startTime.getTime() + spreadMs;
      schedule.push({ accountId, scheduledAt: new Date(current), priority: this.isPeak(new Date(current)) ? 1 : 5 });
    }
    return schedule;
  }
  optimizeForPeakHours(schedule: PostSchedule[]): PostSchedule[] {
    return schedule.map((s) => ({ ...s, priority: this.isPeak(s.scheduledAt) ? 1 : s.priority }));
  }
  addHumanVariation(schedule: PostSchedule[]): PostSchedule[] {
    return schedule.map((s) => ({ ...s, scheduledAt: new Date(s.scheduledAt.getTime() + randomInRange(-30000, 30000)) }));
  }
  private isPeak(d: Date): boolean {
    const h = d.getHours();
    return (this.options.peakHours || []).some((p) => h >= p.start && h < p.end);
  }
}
export const schedulingAlgorithm = new SchedulingAlgorithm();
