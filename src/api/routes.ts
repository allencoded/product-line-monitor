import { Router } from 'express';
import { validateParams, validateQuery, validateBody } from '../utils/validation';
import { equipmentIdParamSchema, alertHistoryQuerySchema, sensorDataPayloadSchema } from '../schemas';
import * as equipmentController from './equipment.controller';
import * as metricsController from './metrics.controller';
import * as alertsController from './alerts.controller';
import * as sensorController from './sensor.controller';
import * as webhookController from './webhook.controller';
import * as queuesController from './queues.controller';

const router = Router();

/**
 * Equipment routes
 */
router.get('/equipment', equipmentController.getAllEquipment);

router.get(
  '/equipment/:id/status',
  validateParams(equipmentIdParamSchema),
  equipmentController.getEquipmentStatus
);

router.get(
  '/equipment/:id/sensor-history',
  validateParams(equipmentIdParamSchema),
  sensorController.getSensorHistory
);

/**
 * Metrics routes
 */
router.get('/metrics/production', metricsController.getProductionMetrics);

/**
 * Alerts routes
 */
router.get(
  '/alerts/history',
  validateQuery(alertHistoryQuerySchema),
  alertsController.getAlertHistory
);

router.get('/alerts/critical', alertsController.getCriticalAlerts);

router.patch(
  '/alerts/:id/resolve',
  validateParams(equipmentIdParamSchema),
  alertsController.resolveAlert
);

/**
 * Sensor routes
 */
router.get('/sensors/types', sensorController.getSensorTypes);

/**
 * Webhook routes
 */
router.post(
  '/webhook/sensor-data',
  validateBody(sensorDataPayloadSchema),
  webhookController.ingestSensorData
);

router.get('/webhook/status/:jobId', webhookController.getWebhookJobStatus);

/**
 * Queue monitoring routes
 */
router.get('/queues/stats', queuesController.getQueueStats);

export default router;
