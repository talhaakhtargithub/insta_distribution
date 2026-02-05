"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedulingAlgorithm = exports.SchedulingAlgorithm = void 0;
const variations_1 = require("../../config/variations");
const DEFAULT_OPTIONS = {
    spreadHours: 6, minGapMs: 120000, maxGapMs: 900000,
    peakHours: [{ start: 6, end: 9 }, { start: 12, end: 14 }, { start: 18, end: 22 }],
};
class SchedulingAlgorithm {
    options;
    constructor(options) { this.options = { ...DEFAULT_OPTIONS, ...options }; }
    calculateDistributionSchedule(accountIds, startTime = new Date()) {
        const schedule = [];
        let current = startTime.getTime();
        const spreadMs = this.options.spreadHours * 3600000;
        for (const accountId of accountIds) {
            current += (0, variations_1.randomInRange)(this.options.minGapMs, this.options.maxGapMs);
            if (current - startTime.getTime() > spreadMs)
                current = startTime.getTime() + spreadMs;
            schedule.push({ accountId, scheduledAt: new Date(current), priority: this.isPeak(new Date(current)) ? 1 : 5 });
        }
        return schedule;
    }
    optimizeForPeakHours(schedule) {
        return schedule.map((s) => ({ ...s, priority: this.isPeak(s.scheduledAt) ? 1 : s.priority }));
    }
    addHumanVariation(schedule) {
        return schedule.map((s) => ({ ...s, scheduledAt: new Date(s.scheduledAt.getTime() + (0, variations_1.randomInRange)(-30000, 30000)) }));
    }
    isPeak(d) {
        const h = d.getHours();
        return (this.options.peakHours || []).some((p) => h >= p.start && h < p.end);
    }
}
exports.SchedulingAlgorithm = SchedulingAlgorithm;
exports.schedulingAlgorithm = new SchedulingAlgorithm();
