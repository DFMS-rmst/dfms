import { asyncHandler } from '../../common/errors.js';
import { prisma } from '../../infrastructure/prisma/client.js';

/**
 * Controller for GET /api/admin/dashboard-stats (and /api/v1/admin/dashboard-stats)
 * Strictly executes SQL/ORM macro queries across existing database schema:
 * 1. Pending Verifications (Governance)
 * 2. MRL Status (Food Safety)
 * 3. AMU & Disease Trends (Health)
 * 4. Dairy Economy (Supply Chain)
 * 5. ML Risk Distribution (AI Monitoring)
 */
export const getAdminDashboardStatsController = asyncHandler(async (_request, response) => {
  // 1. Pending Verifications (Governance)
  // Count the number of rows where status = 'PENDING' in FarmerProfile, VeterinarianProfile, DairyOwnerProfile, Farm
  const [pendingFarmers, pendingVets, pendingDairyOwners, pendingFarms] = await Promise.all([
    prisma.farmerProfile.count({ where: { status: 'PENDING' } }),
    prisma.veterinarianProfile.count({ where: { status: 'PENDING' } }),
    prisma.dairyOwnerProfile.count({ where: { status: 'PENDING' } }),
    prisma.farm.count({ where: { status: 'PENDING' } }),
  ]);

  const pendingVerifications = {
    total: pendingFarmers + pendingVets + pendingDairyOwners + pendingFarms,
    farmerProfiles: pendingFarmers,
    veterinarianProfiles: pendingVets,
    dairyOwnerProfiles: pendingDairyOwners,
    farms: pendingFarms,
  };

  // 2. MRL Status (Food Safety)
  // Count occurrences of each eligibilityStatus ('ELIGIBLE_FOR_MILK', 'UNDER_WITHDRAWAL', 'TREATMENT_ACTIVE') from DailyFarmEligibilityItem
  let mrlStatus = [];
  try {
    const rawMrl = await prisma.$queryRaw`
      SELECT eligibilityStatus, COUNT(*) AS count
      FROM DailyFarmEligibilityItem
      WHERE eligibilityStatus IN ('ELIGIBLE_FOR_MILK', 'UNDER_WITHDRAWAL', 'TREATMENT_ACTIVE')
      GROUP BY eligibilityStatus
    `;
    const mrlMap = {
      ELIGIBLE_FOR_MILK: 0,
      UNDER_WITHDRAWAL: 0,
      TREATMENT_ACTIVE: 0,
    };
    for (const row of rawMrl || []) {
      if (row.eligibilityStatus in mrlMap) {
        mrlMap[row.eligibilityStatus] = Number(row.count);
      }
    }
    mrlStatus = [
      { status: 'ELIGIBLE_FOR_MILK', name: 'Eligible for Milk', count: mrlMap.ELIGIBLE_FOR_MILK },
      { status: 'UNDER_WITHDRAWAL', name: 'Under Withdrawal', count: mrlMap.UNDER_WITHDRAWAL },
      { status: 'TREATMENT_ACTIVE', name: 'Treatment Active', count: mrlMap.TREATMENT_ACTIVE },
    ];
  } catch (_mrlErr) {
    const grouped = await prisma.dailyFarmEligibilityItem.groupBy({
      by: ['eligibilityStatus'],
      _count: { id: true },
      where: {
        eligibilityStatus: {
          in: ['ELIGIBLE_FOR_MILK', 'UNDER_WITHDRAWAL', 'TREATMENT_ACTIVE'],
        },
      },
    });
    const mrlMap = {
      ELIGIBLE_FOR_MILK: 0,
      UNDER_WITHDRAWAL: 0,
      TREATMENT_ACTIVE: 0,
    };
    for (const item of grouped) {
      if (item.eligibilityStatus in mrlMap) {
        mrlMap[item.eligibilityStatus] = item._count.id;
      }
    }
    mrlStatus = [
      { status: 'ELIGIBLE_FOR_MILK', name: 'Eligible for Milk', count: mrlMap.ELIGIBLE_FOR_MILK },
      { status: 'UNDER_WITHDRAWAL', name: 'Under Withdrawal', count: mrlMap.UNDER_WITHDRAWAL },
      { status: 'TREATMENT_ACTIVE', name: 'Treatment Active', count: mrlMap.TREATMENT_ACTIVE },
    ];
  }

  // 3. AMU & Disease Trends (Health)
  // - Antibiotic Classes: Join TreatmentAdministration with Medicine. Group by Medicine.antimicrobialClass and count where Medicine.isAntibiotic = true.
  // - Top Diseases: Join Diagnosis with Disease. Group by Disease.canonicalName, count occurrences, order by highest count (limit top 5).
  let antibioticClasses = [];
  try {
    const rawAntibiotics = await prisma.$queryRaw`
      SELECT m.antimicrobialClass AS antimicrobialClass, COUNT(ta.id) AS count
      FROM TreatmentAdministration ta
      JOIN Medicine m ON ta.medicineId = m.id
      WHERE m.isAntibiotic = true
      GROUP BY m.antimicrobialClass
      ORDER BY count DESC
    `;
    antibioticClasses = (rawAntibiotics || []).map((row) => ({
      antimicrobialClass: row.antimicrobialClass || 'Unclassified',
      name: row.antimicrobialClass || 'Unclassified',
      count: Number(row.count),
    }));
  } catch (_amuErr) {
    const items = await prisma.treatmentAdministration.findMany({
      where: { medicine: { isAntibiotic: true } },
      include: { medicine: true },
    });
    const classCount = {};
    for (const item of items) {
      const cls = item.medicine?.antimicrobialClass || 'Unclassified';
      classCount[cls] = (classCount[cls] || 0) + 1;
    }
    antibioticClasses = Object.entries(classCount)
      .map(([antimicrobialClass, count]) => ({
        antimicrobialClass,
        name: antimicrobialClass,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }

  let topDiseases = [];
  try {
    const rawDiseases = await prisma.$queryRaw`
      SELECT d.canonicalName AS canonicalName, COUNT(diag.id) AS count
      FROM Diagnosis diag
      JOIN Disease d ON diag.diseaseId = d.id
      GROUP BY d.id, d.canonicalName
      ORDER BY count DESC
      LIMIT 5
    `;
    topDiseases = (rawDiseases || []).map((row) => ({
      diseaseName: row.canonicalName,
      name: row.canonicalName,
      count: Number(row.count),
    }));
  } catch (_diseaseErr) {
    const diags = await prisma.diagnosis.findMany({
      where: { diseaseId: { not: null } },
      include: { disease: true },
    });
    const map = {};
    for (const d of diags) {
      const name = d.disease?.canonicalName || 'Unknown';
      map[name] = (map[name] || 0) + 1;
    }
    topDiseases = Object.entries(map)
      .map(([name, count]) => ({ diseaseName: name, name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  const amuAndDiseaseTrends = {
    antibioticClasses,
    topDiseases,
  };

  // 4. Dairy Economy (Supply Chain)
  // Query the dairy_milk_intakes table. Sum quantityLiters grouped by collectionDate for the last 30 days. Also return total sum of totalCost.
  let dailyProcurement = [];
  let totalCost = 0;
  let totalQuantityLiters = 0;
  try {
    const dailyRows = await prisma.$queryRawUnsafe(`
      SELECT
        SUBSTRING(CAST(\`collectionDate\` AS CHAR), 1, 10) AS collectionDate,
        SUM(\`quantityLiters\`) AS quantityLiters,
        SUM(\`totalCost\`) AS cost
      FROM \`dairy_milk_intakes\`
      GROUP BY SUBSTRING(CAST(\`collectionDate\` AS CHAR), 1, 10)
      ORDER BY collectionDate ASC
      LIMIT 30
    `);
    dailyProcurement = (dailyRows || []).map((r) => ({
      collectionDate: String(r.collectionDate || '').slice(0, 10),
      quantityLiters: Number(r.quantityLiters || 0),
      cost: Number(r.cost || 0),
    }));

    const totalSumRows = await prisma.$queryRawUnsafe(`
      SELECT
        SUM(\`totalCost\`) AS totalCost,
        SUM(\`quantityLiters\`) AS totalQuantityLiters
      FROM \`dairy_milk_intakes\`
    `);
    totalCost = Number(totalSumRows?.[0]?.totalCost || 0);
    totalQuantityLiters = Number(totalSumRows?.[0]?.totalQuantityLiters || 0);
  } catch (dairyErr) {
    console.warn('dairy_milk_intakes query in admin dashboard stats:', dairyErr.message);
  }

  const dairyEconomy = {
    totalCost,
    totalQuantityLiters,
    dailyProcurement,
  };

  // 5. ML Risk Distribution
  // Query the AnimalRiskAssessment table. Count number of rows grouped by predictedRisk column.
  let mlRiskDistribution = [];
  try {
    const rawRisk = await prisma.$queryRawUnsafe(`
      SELECT \`predictedRisk\`, COUNT(*) AS count
      FROM \`AnimalRiskAssessment\`
      GROUP BY \`predictedRisk\`
      ORDER BY count DESC
    `);
    mlRiskDistribution = (rawRisk || []).map((row) => ({
      predictedRisk: row.predictedRisk || 'UNKNOWN',
      name: `${row.predictedRisk || 'UNKNOWN'} Risk`,
      count: Number(row.count),
    }));
  } catch (_riskErr) {
    mlRiskDistribution = [];
  }

  const payload = {
    pendingVerifications,
    mrlStatus,
    amuAndDiseaseTrends,
    dairyEconomy,
    mlRiskDistribution,
  };

  response.json({
    data: payload,
    ...payload,
  });
});
