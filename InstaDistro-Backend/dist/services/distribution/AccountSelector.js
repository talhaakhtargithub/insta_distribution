"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountSelector = exports.AccountSelector = void 0;
const database_1 = require("../../config/database");
const logger_1 = require("../../config/logger");
class AccountSelector {
    async selectAccounts(criteria) {
        try {
            let query = `SELECT * FROM accounts WHERE user_id = $1 AND account_status IN ('active', 'warming') AND is_authenticated = true`;
            const params = [criteria.userId];
            if (criteria.excludeIds && criteria.excludeIds.length > 0) {
                query += ' AND id != ANY($' + (params.length + 1) + ')';
                params.push(criteria.excludeIds);
            }
            if (criteria.minHealthScore !== undefined) {
                query += ' AND COALESCE(health_score, 50) >= $' + (params.length + 1);
                params.push(criteria.minHealthScore);
            }
            query += ' ORDER BY COALESCE(last_post_at, created_at) ASC LIMIT $' + (params.length + 1);
            params.push(criteria.count);
            const result = await database_1.pool.query(query, params);
            return result.rows;
        }
        catch (err) {
            logger_1.logger.error('AccountSelector:', { error: err });
            return [];
        }
    }
    calculateAccountScore(account) {
        let score = 50;
        if (account.last_post_at) {
            const hrs = (Date.now() - new Date(account.last_post_at).getTime()) / 3600000;
            score += Math.min(hrs * 2, 30);
        }
        if (account.health_score)
            score += account.health_score * 0.2;
        if (account.follower_count)
            score += Math.min(account.follower_count / 1000, 10);
        return Math.round(score);
    }
    rotateLeadAccounts(accounts) {
        if (accounts.length < 2)
            return accounts;
        const arr = [...accounts];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
    filterUnavailable(accounts) {
        return accounts.filter((a) => a.account_status !== 'suspended' && a.account_status !== 'banned' && a.account_status !== 'error' &&
            (!a.auto_paused_until || new Date(a.auto_paused_until) < new Date()));
    }
}
exports.AccountSelector = AccountSelector;
exports.accountSelector = new AccountSelector();
