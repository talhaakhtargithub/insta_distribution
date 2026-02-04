import { Router } from 'express';
import { distributionController } from '../controllers/DistributionController';
import { authMiddleware } from '../middlewares/auth.middleware';
const router = Router();
router.use(authMiddleware);
router.post('/start',      distributionController.startDistribution.bind(distributionController));
router.get('/:id/status',  distributionController.getDistributionStatus.bind(distributionController));
router.post('/:id/cancel', distributionController.cancelDistribution.bind(distributionController));
export default router;
