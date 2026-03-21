import api from './axios';

/**
 * Call a single provision step on the backend.
 * step is a number 1..5
 */
export async function provisionStep(companyId, step) {
  if (!companyId) throw new Error('companyId required');
  if (!step) throw new Error('step required');
  const url = `/saas/company/${companyId}/provision/step${step}`;
  return api.post(url);
}

/**
 * Provision company by calling steps 1..5 sequentially.
 * onProgress(optional) will be called with ({ step, result }) after each step.
 * Stops on first failure and throws the error.
 */
export async function provisionAllSteps(companyId, { onProgress } = {}) {
  if (!companyId) throw new Error('companyId required');
  const results = [];
  for (let step = 1; step <= 5; step++) {
    try {
      const res = await provisionStep(companyId, step);
      results.push({ step, success: true, response: res });
      if (typeof onProgress === 'function') onProgress({ step, result: res });
    } catch (err) {
      results.push({ step, success: false, error: err });
      if (typeof onProgress === 'function') onProgress({ step, error: err });
      throw { step, error: err, results };
    }
  }
  return results;
}

export default { provisionStep, provisionAllSteps };
