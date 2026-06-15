require('dotenv').config();

const { connectMongoose } = require('../../../models/mongoose');
const { allModules } = require('../data/modules.data');
const Addon = require('../../models/addon.model');
const { UserAuth } = require('../../../models/user.model');

async function getSuperAdminId() {
  const superAdmin = await UserAuth.findOne({ type: 'SA' });
  if (!superAdmin) throw new Error('Superadmin not found');
  return superAdmin._id;
}

async function run() {
  await connectMongoose(process.env.MONGO_URI);
  const superAdminId = await getSuperAdminId();

  console.log('Generating feature-type addons from modules...');

  let count = 0;

  for (const mod of allModules) {
    if (!Array.isArray(mod.actions)) continue;
    for (const action of mod.actions) {
      // skip module root entries which sometimes include module itself (no parentId)
      if (!action || !action.key) continue;

      const value = action.key; // keep key as unique value
      const name = action.label || action.key;
      const description = `${mod.displayName || mod.group} - ${action.label || action.key}`;

      const payload = {
        value,
        name,
        description,
        type: 'feature',
        scope: 'global',
        provides: { permissions: [action.key] },
        billingType: 'onetime',
        expiryType: 'duration',
        durationDays: 30,
        pricePaise: 0,
        hasTax: true,
        taxIncluded: true,
        taxName: 'GST',
        isActive: true,
        isDeleted: false,
        isSystem: true,
        createdBy: superAdminId,
      };

      await Addon.updateOne(
        { value },
        { $set: payload },
        { upsert: true, setDefaultsOnInsert: true }
      );

      count++;
    }
  }

  console.log(`Done. Upserted/updated ${count} feature-addons.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Error generating addons:', err);
  process.exit(1);
});
