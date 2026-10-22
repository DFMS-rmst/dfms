import { asyncHandler } from '../../common/errors.js';
import { prisma } from '../../infrastructure/prisma/client.js';

export const getVetAnalyticsController = asyncHandler(async (request, response) => {
  // Extract veterinarianId from authenticated user or query (for admin/testing)
  let veterinarianId = request.query.veterinarianId;
  if (!veterinarianId) {
    const profile = await prisma.veterinarianProfile.findUnique({
      where: { userId: request.principal.user.id },
      select: { id: true },
    });
    veterinarianId = profile?.id;
  }

  if (!veterinarianId) {
    const emptyPayload = {
      kpiStats: {
        totalCases: 0,
        activeTreatments: 0,
        antibioticsPrescribed: 0,
      },
      amuProfile: [],
      topDiseases: [],
    };
    return response.json({
      data: emptyPayload,
      ...emptyPayload,
    });
  }

  // 1. kpiStats:
  // - Total cases (from VeterinaryCase)
  // - Active treatments (from Treatment where status = 'ACTIVE')
  // - Total antibiotics prescribed (from PrescriptionItem JOIN Medicine where isAntibiotic=true)
  // All filtered by veterinarianId
  const [totalCases, activeTreatments, antibioticsPrescribed] = await Promise.all([
    prisma.veterinaryCase.count({
      where: { veterinarianId },
    }),
    prisma.treatment.count({
      where: { veterinarianId, status: 'ACTIVE' },
    }),
    prisma.prescriptionItem.count({
      where: {
        prescription: { veterinarianId },
        medicine: { isAntibiotic: true },
      },
    }),
  ]);

  const kpiStats = {
    totalCases,
    activeTreatments,
    antibioticsPrescribed,
  };

  // 2. amuProfile: breakdown of prescribed antimicrobialClass counts
  // (from Medicine JOIN PrescriptionItem JOIN Prescription filtered by veterinarianId)
  let amuProfile = [];
  try {
    const rawAmu = await prisma.$queryRaw`
      SELECT m.antimicrobialClass AS antimicrobialClass, COUNT(pi.id) AS count
      FROM Medicine m
      JOIN PrescriptionItem pi ON pi.medicineId = m.id
      JOIN Prescription p ON pi.prescriptionId = p.id
      WHERE p.veterinarianId = ${veterinarianId}
      GROUP BY m.antimicrobialClass
      ORDER BY count DESC
    `;
    amuProfile = (rawAmu || []).map((row) => ({
      antimicrobialClass: row.antimicrobialClass || 'Unclassified',
      count: Number(row.count),
    }));
  } catch (_sqlError) {
    const items = await prisma.prescriptionItem.findMany({
      where: { prescription: { veterinarianId } },
      include: { medicine: true },
    });
    const classMap = {};
    for (const item of items) {
      const cls = item.medicine?.antimicrobialClass || 'Unclassified';
      classMap[cls] = (classMap[cls] || 0) + 1;
    }
    amuProfile = Object.entries(classMap)
      .map(([antimicrobialClass, count]) => ({ antimicrobialClass, count }))
      .sort((a, b) => b.count - a.count);
  }

  // 3. topDiseases: count of the top 5 diagnosed diseases
  // (from Diagnosis JOIN Disease filtered by veterinarianId)
  let topDiseases = [];
  try {
    const rawDiseases = await prisma.$queryRaw`
      SELECT d.canonicalName AS diseaseName, COUNT(diag.id) AS count
      FROM Diagnosis diag
      JOIN Disease d ON diag.diseaseId = d.id
      WHERE diag.veterinarianId = ${veterinarianId}
      GROUP BY d.id, d.canonicalName
      ORDER BY count DESC
      LIMIT 5
    `;
    topDiseases = (rawDiseases || []).map((row) => ({
      name: row.diseaseName,
      diseaseName: row.diseaseName,
      count: Number(row.count),
    }));
  } catch (_sqlError) {
    const diagnoses = await prisma.diagnosis.findMany({
      where: { veterinarianId, diseaseId: { not: null } },
      include: { disease: true },
    });
    const diseaseMap = {};
    for (const d of diagnoses) {
      const name = d.disease?.canonicalName || 'Unknown';
      diseaseMap[name] = (diseaseMap[name] || 0) + 1;
    }
    topDiseases = Object.entries(diseaseMap)
      .map(([name, count]) => ({ name, diseaseName: name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  const payload = {
    kpiStats,
    amuProfile,
    topDiseases,
  };

  response.json({
    data: payload,
    ...payload,
  });
});
