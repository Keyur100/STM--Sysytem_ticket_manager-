// const axios = require('axios');
// const CompanyService = require('../services/company.service');
// const { sendSuccess, sendError } = require('../../utils/response');
// const { encrypt, decrypt } = require('../utils/crypto');

// const syncCompany = async (req, res) => {
//   try {
//     const companyId = req.params.companyId;
//     const secret = process.env.SYNC_API_SECRET;
//     const remoteUrl = process.env.SYNC_REMOTE_URL;

//     if (!secret || !remoteUrl) {
//       return sendError(res, 500, 'Sync secret or remote URL not configured');
//     }

//     const fullDetails = await CompanyService.getCompanyFullDetails(companyId);
//     if (!fullDetails) return sendError(res, 404, 'Company not found');

//     // Encrypt payload
//     const payloadEnc = encrypt(fullDetails, secret);

//     // Send to remote Laravel API
//      const resp = await axios.post(remoteUrl, { payload: payloadEnc }, { timeout: 20000 });

//     // Expecting response.payload to be encrypted
//     const respData = resp.data;
//     if (!respData || !respData.payload) {
//       return sendError(res, 502, 'Invalid response from remote sync endpoint');
//     }

//     const decrypted = decrypt(respData.payload, secret);

//     return sendSuccess(res, { remote: decrypted }, 'Sync completed');
//   } catch (err) {
//     console.error('Error in syncCompany:', err.message || err);
//     return sendError(res, 500, err.message || 'Sync failed');
//   }
// };

// module.exports = { syncCompany };

const CompanyService = require('../services/company.service');
const { sendSecureRequest } = require('../services/sync.service.js');
const subscriptionModel = require('../models/subscription.model');
const { verifySignature } = require('../utils/crypto');
const config = require('../config/env');
const SyncLog = require('../models/syncLog.model');

/**
 * POST /saas/sync/:companyId
 * Push local company data to remote Laravel API using signed request headers.
 */
const syncCompany = async (req, res) => {
  try {
    const companyId = req.params.companyId;

    if (!companyId) return res.status(400).json({ message: 'companyId required' });

    const company = await CompanyService.getCompanyFullDetails(companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    // send payload — keep payload small (avoid circular refs)
    const payload = { company };

    const response = await sendSecureRequest(payload);

    // Be defensive about remote response shape
    if (!response) {
      return res.status(502).json({ message: 'No response from remote' });
    }

    const remoteData = response.data || null;

    return res.status(200).json({ message: 'Sync successful', remote: remoteData });
  } catch (err) {
    console.error('Sync error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Sync failed', error: err.message || String(err) });
  }
};

/**
 * Example webhook handler to accept incoming signed requests from remote Laravel server.
 * The remote must send JSON body and the headers: x-api-key, x-timestamp, x-signature
 * This verifies the signature (HMAC SHA256) and checks a replay window.
 */
const webhookHandler = async (req, res) => {
  try {
    const receivedApiKey = req.get('x-api-key');
    const timestamp = req.get('x-timestamp');
    const signature = req.get('x-signature');

    if (!receivedApiKey || !timestamp || !signature) {
      return res.status(400).json({ message: 'Missing required headers' });
    }

    if (receivedApiKey !== config.apiKey) {
      return res.status(403).json({ message: 'Invalid api key' });
    }

    // Prevent replay attacks: allow ±5 minutes window
    const now = Date.now();
    const ts = Number(timestamp);
    if (Number.isNaN(ts) || Math.abs(now - ts) > 5 * 60 * 1000) {
      return res.status(400).json({ message: 'Invalid or expired timestamp' });
    }

    // Verify signature using same algorithm as sendSecureRequest
    const body = req.body || {};
    const ok = verifySignature(config.apiSecret, timestamp, body, signature);
    if (!ok) return res.status(403).json({ message: 'Invalid signature' });

    // At this point, body is trusted. Process as needed.
    // Example: if remote sends { type: 'company_sync', company: {...} }
    const { type, company: remoteCompany } = body;
    if (type === 'company_sync' && remoteCompany && remoteCompany._id) {
      // upsert or process payload
      // e.g. await CompanyService.upsertFromRemote(remoteCompany);
      return res.status(200).json({ message: 'Received company sync' });
    }

    return res.status(200).json({ message: 'Webhook received' });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ message: 'Webhook processing failed', error: err.message });
  }
};

/**
 * POST /saas/:companyId/sync/step/:step
 * step values: 1,2,3,4,5
 * Determines URL based on company's plan trial status
 */
const syncStep = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const step = String(req.params.step || '');
    if (!companyId) return res.status(400).json({ message: 'companyId required' });

    // Get company details to check plan trial status
    const company = await CompanyService.getCompanyFullDetails(companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    // Determine trial mode from explicit company flag, falling back to plan snapshot metadata
    const isTrial = company.company.isTrialUsed === true ||
      String(company.planSnapshot?.name || '').toLowerCase().includes('trial');
    
    const syncType = isTrial ? 'trial' : 'actual';

    let payload = {};
    // Build step-specific payloads using lightweight helpers
    if (step === '1') {
      const s1 = await CompanyService.getCompanySyncStep1Data(companyId);
      if (!s1) return res.status(404).json({ message: 'Company not found' });
      payload = { company: s1.company, branches: s1.branches || [], clientUsers: s1.clientUsers || [] };
    } else if (step === '2') {
      const s2 = await CompanyService.getCompanySyncStep2Data(companyId);
      if (!s2) return res.status(404).json({ message: 'Company not found' });
      payload = { company_id: s2.company_id, plan: s2.plan || {}, orderSummary: s2.orderSummary || {}, transactions: s2.transactions || [], wallet: s2.wallet || {} };
    } else if (step === '3') {
      const s3 = await CompanyService.getCompanySyncStep3Data(companyId);
      if (!s3) return res.status(404).json({ message: 'Company not found' });
      payload = { company_id: s3.company_id, modulePermissions: s3.modulePermissions || [] };
    } else if (step === '4') {
      const s4 = await CompanyService.getCompanySyncStep4Data(companyId);
      if (!s4) return res.status(404).json({ message: 'Company not found' });
      payload = { company_id: s4.company_id };
    } else if (step === '5') {
      const s5 = await CompanyService.getCompanySyncStep5Data(companyId);
      if (!s5) return res.status(404).json({ message: 'Company not found' });
      payload = { company_id: s5.company_id };
    } else {
      return res.status(400).json({ message: 'Invalid step' });
    }

    // Select appropriate remote URLs based on trial status
    const remoteUrlsMap = isTrial ? config.testRemoteUrls : config.actualRemoteUrls;
    const stepUrl = remoteUrlsMap?.[step] || config.remoteUrl;

    try {
      const response = await sendSecureRequest(payload, stepUrl);
      // record success log with sync type
      await SyncLog.create({ 
        companyId, 
        step, 
        status: 'success', 
        message: 'OK',
        type: syncType,
        remoteResponse: response?.data || null 
      });
      return res.status(200).json({ message: 'Step sync successful', remote: response.data || null, syncType });
    } catch (err) {
      await SyncLog.create({ 
        companyId, 
        step, 
        status: 'failed', 
        message: err.message || String(err),
        type: syncType,
        remoteResponse: err.response?.data || null 
      });
      return res.status(502).json({ message: 'Remote call failed', error: err.message || String(err) });
    }
  } catch (err) {
    // console.error('syncStep error:', err);
    return res.status(500).json({ message: 'sync step failed', error: err.response?.data?.message || String(err) });
  }
};

const getSyncLogs = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    if (!companyId) return res.status(400).json({ message: 'companyId required' });
    const logs = await SyncLog.find({ companyId }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ logs });
  } catch (err) {
    console.error('getSyncLogs error:', err);
    return res.status(500).json({ message: 'Failed to get logs', error: err.message });
  }
};

/**
 * POST /saas/:companyId/sync/upgrade/:step
 * step values: 1,2
 * Upgrade/Downgrade sync with 2 steps (permission-aware)
 */
const syncUpgradeDowngrade = async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const step = String(req.params.step || '');
    if (!companyId) return res.status(400).json({ message: 'companyId required' });

    // Validate step is 1 or 2
    if (!['1', '2'].includes(step)) {
      return res.status(400).json({ message: 'Invalid step. Only steps 1-2 supported for upgrade sync' });
    }

    // Get company record and current subscription from the subscription model
    const company = await CompanyService.getCompanyById(companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const currentSubscription = company.activeSubscriptionId
      ? await subscriptionModel.findById(company.activeSubscriptionId).lean()
      : await subscriptionModel.findOne({ companyId, status: 'active' }).sort({ createdAt: -1 }).lean();

    if (!currentSubscription) {
      return res.status(400).json({ message: 'No active subscription found for company' });
    }

    if (!currentSubscription.previousSubscriptionId) {
      return res.status(400).json({ message: 'This subscription is not an upgrade/downgrade' });
    }

    let payload = {};

    if (step === '1') {
      // Step 1: Send company details similar to provision step 1
      const s1 = await CompanyService.getCompanySyncStep2Data(companyId);
      if (!s1) return res.status(404).json({ message: 'Company not found' });
      payload = { company_id: s1.company_id, plan: s1.plan || {}, orderSummary: s1.orderSummary || {}, transactions: s1.transactions || [], wallet: s1.wallet || {} };
    } else if (step === '2') {
      // Step 2: Send permission changes (extraAddedPermission and removedPermission only)
      const s3 = await CompanyService.getCompanySyncStep3Data(companyId);
      if (!s3) return res.status(404).json({ message: 'Company not found' });

      // Compare permissions with previous subscription
const previousSubscription = await subscriptionModel.findById(currentSubscription.previousSubscriptionId).lean();
        if (previousSubscription && previousSubscription.planSnapshot?.modulePermissions) {
          const previousPermissions = previousSubscription.planSnapshot.modulePermissions;
          const currentPermissions = currentSubscription.planSnapshot?.modulePermissions || [];

        // Calculate extraAddedPermission and removedPermission based on enabled status
        const extraAddedPermission = [];
        const removedPermission = [];

        // Create maps for easier lookup
        const previousPermMap = {};
        previousPermissions.forEach(module => {
          if (module.actions) {
            module.actions.forEach(action => {
              const key = `${module.moduleKey}:${action.key}`;
              previousPermMap[key] = action.enabled;
            });
          }
        });

        const currentPermMap = {};
        currentPermissions.forEach(module => {
          if (module.actions) {
            module.actions.forEach(action => {
              const key = `${module.moduleKey}:${action.key}`;
              currentPermMap[key] = action.enabled;
            });
          }
        });

        // Compare permissions
        Object.keys(currentPermMap).forEach(permKey => {
          const currentEnabled = currentPermMap[permKey];
          const previousEnabled = previousPermMap[permKey];

          // If current has enabled: true and previous had enabled: false or undefined
          if (currentEnabled === true && previousEnabled !== true) {
            extraAddedPermission.push(permKey);
          }
          // If current has enabled: false and previous had enabled: true
          else if (currentEnabled === false && previousEnabled === true) {
            removedPermission.push(permKey);
          }
        });

        // Check for permissions that exist in previous but not in current (removed)
        Object.keys(previousPermMap).forEach(permKey => {
          if (!(permKey in currentPermMap) && previousPermMap[permKey] === true) {
            removedPermission.push(permKey);
          }
        });

        payload = {
          company_id: s3.company_id,
          extraAddedPermission,
          removedPermission
        };
      } else {
        payload = { company_id: s3.company_id };
      }
    }

    // Get upgrade remote URLs and send request
    const stepUrl = config.upgradeRemoteUrls?.[step];
    if (!stepUrl) {
      return res.status(500).json({ message: `Upgrade step ${step} URL not configured` });
    }

    try {
      const response = await sendSecureRequest(payload, stepUrl);
      // record success log
      await SyncLog.create({
        companyId,
        step,
        status: 'success',
        message: 'OK',
        type: 'upgrade',
        remoteResponse: response?.data || null
      });
      return res.status(200).json({ message: 'Upgrade sync step successful', remote: response.data || null });
    } catch (err) {
      await SyncLog.create({
        companyId,
        step,
        status: 'failed',
        message: err.message || String(err),
        type: 'upgrade',
        remoteResponse: err.response?.data || null
      });
      return res.status(502).json({ message: 'Remote call failed', error: err.message || String(err) });
    }
  } catch (err) {
    console.error('syncUpgradeDowngrade error:', err);
    return res.status(500).json({ message: 'Upgrade sync failed', error: err.response?.data?.message || String(err) });
  }
};

module.exports = { syncCompany, webhookHandler, syncStep, syncUpgradeDowngrade, getSyncLogs };

// POST /saas/company/:companyId/stats
const companyStats = async (req, res) => {
  try {
    const companyKey = req.body.companyKey;
    if (!companyKey) return res.status(400).json({ message: 'companyKey required' });

    const statsUrl = process.env.COMPANY_STATS_URL || config.remoteCompanyStatsUrl || null;
    if (!statsUrl) return res.status(500).json({ message: 'Company stats URL not configured' });

    const payload = { companyKey };
    const response = await sendSecureRequest(payload, statsUrl);
    if (!response || !response.data) return res.status(502).json({ message: 'Invalid remote response' });

    return res.status(200).json({ message: 'Company statistics retrieved', data: response.data });
  } catch (err) {
    console.error('companyStats error:', err);
    return res.status(500).json({ message: 'Failed to fetch company stats', error: err.message || String(err) });
  }
};

module.exports.companyStats = companyStats;
