import {
    initiateMaskedCall,
    handleExotelCallback,
    handleExotelPassthru,
    isCallMaskingConfigured
} from '../services/callMasking.service.js';
import { config } from '../../../../config/env.js';
import logger from '../../../../utils/logger.js';

/**
 * POST /api/v1/food/calls/bridge
 * Initiate a secure masked call between order participants.
 */
export async function initiateCallBridgeController(req, res) {
    try {
        const { orderId, targetRole, callerPhoneOverride } = req.body;
        const callerUser = req.user || { role: 'USER' };

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'orderId is required in request body'
            });
        }
        if (!targetRole) {
            return res.status(400).json({
                success: false,
                message: 'targetRole (rider | customer | restaurant) is required'
            });
        }

        const result = await initiateMaskedCall({
            orderId,
            callerUser,
            targetRole,
            customCallerPhone: callerPhoneOverride
        });

        return res.status(200).json(result);
    } catch (err) {
        logger.error(`[CallController] Error initiating call bridge: ${err.message}`, err);
        return res.status(500).json({
            success: false,
            fallbackToDirect: true,
            message: err.message || 'Failed to initiate secure call'
        });
    }
}

/**
 * POST /api/v1/food/calls/callback
 * Webhook for Exotel call status updates (CDR).
 */
export async function exotelCallbackController(req, res) {
    try {
        const payload = { ...req.query, ...req.body };
        await handleExotelCallback(payload);
        return res.status(200).send('OK');
    } catch (err) {
        logger.error(`[CallController] Webhook callback error: ${err.message}`);
        return res.status(200).send('OK'); // Always 200 for telecom webhooks
    }
}

/**
 * GET /api/v1/food/calls/passthru
 * Inbound passthrough applet for Exotel when a user dials the virtual number.
 */
export async function exotelPassthruController(req, res) {
    try {
        const query = { ...req.query, ...req.body };
        const result = await handleExotelPassthru(query);

        if (result.action === 'dial' && result.destination) {
            // Exotel passthru HTTP 200 response with destination number
            res.setHeader('Content-Type', 'text/plain');
            return res.status(200).send(result.destination);
        }

        return res.status(200).send('0');
    } catch (err) {
        logger.error(`[CallController] Passthru error: ${err.message}`);
        return res.status(200).send('0');
    }
}

/**
 * GET /api/v1/food/calls/config
 * Public/User check for call masking availability and virtual number.
 */
export async function getCallConfigController(_req, res) {
    const configured = isCallMaskingConfigured();
    return res.status(200).json({
        success: true,
        data: {
            enabled: configured,
            virtualNumber: config.exotelVirtualNumbers?.[0] || null,
            allVirtualNumbers: config.exotelVirtualNumbers || []
        }
    });
}
