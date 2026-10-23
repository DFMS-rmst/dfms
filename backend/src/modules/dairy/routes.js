import crypto from 'node:crypto';
import { Router } from 'express';
import { authenticate } from '../../common/auth.js';
import { AppError, asyncHandler } from '../../common/errors.js';
import { prisma } from '../../infrastructure/prisma/client.js';

export const dairyRouter = Router();
dairyRouter.use(authenticate);

async function resolveDairyUserId(request) {
  if (!request.user) return 'usr_demo_dairy';
  const userRows = await prisma.$queryRawUnsafe(
    'SELECT 1 FROM `dairy_farmer_enrollments` WHERE `dairyUserId` = ? LIMIT 1',
    request.user.id,
  );
  if (Array.isArray(userRows) && userRows.length > 0) {
    return request.user.id;
  }
  const dairyGmail = await prisma.user.findFirst({ where: { email: 'dairy@gmail.com' } });
  if (dairyGmail) {
    const gmailRows = await prisma.$queryRawUnsafe(
      'SELECT 1 FROM `dairy_farmer_enrollments` WHERE `dairyUserId` = ? LIMIT 1',
      dairyGmail.id,
    );
    if (Array.isArray(gmailRows) && gmailRows.length > 0) {
      return dairyGmail.id;
    }
  }
  return request.user.id;
}

function extractTreatmentDetails(treatment) {
  const adminItem = treatment.administrations?.[0];
  const rxItem = treatment.prescription?.items?.[0];
  const drugName =
    adminItem?.medicine?.medicineName ||
    rxItem?.medicine?.medicineName ||
    adminItem?.medicineName ||
    'Veterinary Medication';
  const route = adminItem?.route || rxItem?.route || 'Intramuscular';
  const dose = adminItem?.amount
    ? Number(adminItem.amount)
    : rxItem?.doseValue
      ? Number(rxItem.doseValue)
      : null;
  const unit = adminItem?.amountUnit || rxItem?.doseUnit || 'ml';

  return { drugName, route, dose, unit };
}

function calculateAnimalMilkStatus(animal) {
  const activeTreatments = (animal.treatments || []).filter((t) => t.status === 'ACTIVE');
  if (activeTreatments.length > 0) {
    const latest = activeTreatments[0];
    const { drugName, route } = extractTreatmentDetails(latest);
    return {
      status: 'TREATMENT_ACTIVE',
      label: 'Under Active Treatment',
      isEligible: false,
      blocker: 'Active clinical treatment is ongoing',
      drug: drugName,
      route,
      treatmentDate: latest.createdAt,
      withdrawalEndsAt: null,
    };
  }

  const completedTreatments = (animal.treatments || [])
    .filter((t) => t.status === 'COMPLETED')
    .sort(
      (a, b) => new Date(b.completedAt || b.updatedAt) - new Date(a.completedAt || a.updatedAt),
    );

  const now = new Date();
  for (const treatment of completedTreatments) {
    const completedAt = new Date(treatment.completedAt || treatment.updatedAt);
    const withdrawalHours = 72; // default safety window if not evaluated
    const withdrawalEnds = new Date(completedAt.getTime() + withdrawalHours * 3600 * 1000);

    if (now < withdrawalEnds) {
      const { drugName, route } = extractTreatmentDetails(treatment);
      return {
        status: 'UNDER_WITHDRAWAL',
        label: 'Under Withdrawal Period',
        isEligible: false,
        blocker: `Withdrawal period active until ${withdrawalEnds.toLocaleDateString()}`,
        drug: drugName,
        route,
        treatmentDate: treatment.completedAt,
        withdrawalEndsAt: withdrawalEnds.toISOString(),
      };
    }
  }

  const latestCert = (animal.certificates || []).find((c) => c.status === 'ACTIVE');
  return {
    status: 'ELIGIBLE_FOR_MILK',
    label: 'Eligible For Milk Collection',
    isEligible: true,
    blocker: null,
    certificateNumber: latestCert?.certificateNumber || null,
    certificateVerificationId: latestCert?.verificationId || null,
    drug: null,
    route: null,
    treatmentDate: null,
    withdrawalEndsAt: null,
  };
}

// =========================================================================
// 1. DISTINCT AREAS FOR LOCATION FILTERING
// =========================================================================
dairyRouter.get(
  '/areas',
  asyncHandler(async (request, response) => {
    const dairyUserId = await resolveDairyUserId(request);

    const enrollmentAreas = await prisma.$queryRawUnsafe(
      'SELECT DISTINCT `villageArea` as area, `district`, `state` FROM `dairy_farmer_enrollments` WHERE `dairyUserId` = ? AND `villageArea` IS NOT NULL AND `villageArea` != "" ORDER BY `villageArea` ASC',
      dairyUserId,
    );

    const farmDistricts = await prisma.farm.findMany({
      select: { district: true, state: true, taluka: true },
      distinct: ['district'],
      where: { status: 'ACTIVE' },
    });

    const areasSet = new Set();
    for (const row of enrollmentAreas) {
      if (row.area) areasSet.add(row.area);
    }
    for (const f of farmDistricts) {
      if (f.district) areasSet.add(f.district);
      if (f.taluka) areasSet.add(f.taluka);
    }

    response.json({
      data: {
        areas: Array.from(areasSet).sort(),
      },
    });
  }),
);

// =========================================================================
// 2. FARMER DIRECTORY & SEARCH WITH AREA FILTERING
// =========================================================================
dairyRouter.get(
  '/farmers',
  asyncHandler(async (request, response) => {
    const { search = '', area = '' } = request.query;
    const dairyUserId = await resolveDairyUserId(request);

    const farms = await prisma.farm.findMany({
      where: { status: { in: ['ACTIVE', 'PENDING'] } },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            farmerProfile: true,
          },
        },
        animals: {
          where: { status: 'ACTIVE' },
          include: {
            species: { select: { canonicalName: true } },
            treatments: {
              where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
              include: {
                administrations: {
                  include: { medicine: true },
                  take: 1,
                  orderBy: { administeredAt: 'desc' },
                },
                prescription: {
                  include: {
                    items: {
                      include: { medicine: true },
                      take: 1,
                    },
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
            certificates: {
              where: { status: 'ACTIVE' },
              orderBy: { issuedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    let farmers = farms.map((f) => {
      const animalStatuses = f.animals.map(calculateAnimalMilkStatus);
      const eligibleCount = animalStatuses.filter((s) => s.isEligible).length;
      const underWithdrawalCount = animalStatuses.filter(
        (s) => s.status === 'UNDER_WITHDRAWAL',
      ).length;
      const underTreatmentCount = animalStatuses.filter(
        (s) => s.status === 'TREATMENT_ACTIVE',
      ).length;
      const farmerIdNumber =
        f.createdBy?.farmerProfile?.farmerIdNumber || `FRM-${f.id.slice(-6).toUpperCase()}`;

      return {
        farmId: f.id,
        farmName: f.name,
        state: f.state,
        district: f.district,
        taluka: f.taluka,
        villageArea: f.taluka ? `${f.taluka}, ${f.district}` : f.district,
        pincode: f.pincode,
        farmStatus: f.status,
        farmerIdNumber,
        farmerName: f.createdBy?.fullName || 'Registered Farmer',
        farmerPhone: f.createdBy?.phone || null,
        farmerEmail: f.createdBy?.email || null,
        totalAnimals: f.animals.length,
        eligibleAnimalsCount: eligibleCount,
        withholdingAnimalsCount: underWithdrawalCount + underTreatmentCount,
        allClearForMilk: f.animals.length > 0 && eligibleCount === f.animals.length,
      };
    });

    // Also include enrolled farmers from dairy_farmer_enrollments
    const enrollments = await prisma.$queryRawUnsafe(
      'SELECT * FROM `dairy_farmer_enrollments` WHERE `dairyUserId` = ? ORDER BY `createdAt` DESC',
      dairyUserId,
    );

    for (const enr of enrollments) {
      const existing = farmers.find(
        (f) => f.farmerIdNumber.toLowerCase() === enr.farmerIdNumber.toLowerCase(),
      );
      if (existing) {
        existing.villageArea = enr.villageArea || existing.villageArea;
        existing.enrollmentStatus = enr.status;
        existing.agreedRatePerLiter = Number(enr.agreedRatePerLiter || 42);
        existing.expectedDailyQuantity = Number(enr.expectedDailyQuantity || 20);
        existing.milkType = enr.milkType;
      } else {
        farmers.push({
          farmId: enr.id,
          farmName: enr.farmName,
          state: enr.state,
          district: enr.district,
          taluka: enr.taluka,
          villageArea: enr.villageArea,
          pincode: enr.pincode,
          farmStatus: 'ACTIVE',
          enrollmentStatus: enr.status,
          farmerIdNumber: enr.farmerIdNumber,
          farmerName: enr.farmerName,
          farmerPhone: enr.phone,
          farmerEmail: enr.email,
          totalAnimals: 0,
          eligibleAnimalsCount: 0,
          withholdingAnimalsCount: 0,
          allClearForMilk: true,
          agreedRatePerLiter: Number(enr.agreedRatePerLiter || 42),
          expectedDailyQuantity: Number(enr.expectedDailyQuantity || 20),
          milkType: enr.milkType,
        });
      }
    }

    // Apply Search Filter (Farmer ID, Farmer Name, Farm Name)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      farmers = farmers.filter(
        (f) =>
          f.farmerIdNumber.toLowerCase().includes(q) ||
          f.farmerName.toLowerCase().includes(q) ||
          f.farmName.toLowerCase().includes(q) ||
          (f.farmerPhone && f.farmerPhone.includes(q)),
      );
    }

    // Apply Area / Location Name Filter
    if (area && area.trim()) {
      const a = area.trim().toLowerCase();
      farmers = farmers.filter(
        (f) =>
          (f.villageArea && f.villageArea.toLowerCase().includes(a)) ||
          (f.district && f.district.toLowerCase().includes(a)) ||
          (f.taluka && f.taluka.toLowerCase().includes(a)) ||
          (f.state && f.state.toLowerCase().includes(a)),
      );
    }

    response.json({ data: { farmers } });
  }),
);

// =========================================================================
// 3. FARMER ENROLLMENTS & JOIN REQUESTS (CRUD)
// =========================================================================
dairyRouter.get(
  '/enrollments',
  asyncHandler(async (request, response) => {
    const { status, search, area } = request.query;
    await resolveDairyUserId(request);

    let query = 'SELECT * FROM `dairy_farmer_enrollments` WHERE 1=1';
    const params = [];

    if (status && status !== 'ALL') {
      query += ' AND `status` = ?';
      params.push(status);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      query +=
        ' AND (`farmerIdNumber` LIKE ? OR `farmerName` LIKE ? OR `farmName` LIKE ? OR `phone` LIKE ?)';
      params.push(q, q, q, q);
    }

    if (area && area.trim()) {
      const a = `%${area.trim()}%`;
      query += ' AND (`villageArea` LIKE ? OR `district` LIKE ? OR `taluka` LIKE ?)';
      params.push(a, a, a);
    }

    query += ' ORDER BY `createdAt` DESC';

    const rows = await prisma.$queryRawUnsafe(query, ...params);

    const enrollments = rows.map((r) => ({
      ...r,
      expectedDailyQuantity: Number(r.expectedDailyQuantity || 0),
      agreedRatePerLiter: Number(r.agreedRatePerLiter || 0),
      baseFatPercentage: Number(r.baseFatPercentage || 0),
      baseSnfPercentage: Number(r.baseSnfPercentage || 0),
    }));

    response.json({ data: { enrollments } });
  }),
);

dairyRouter.post(
  '/enrollments',
  asyncHandler(async (request, response) => {
    const dairyUserId = await resolveDairyUserId(request);
    const body = request.body || {};

    if (!body.farmerIdNumber || !body.farmerName || !body.farmName) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Farmer ID, Farmer Name, and Farm Name are required.',
      );
    }

    const id = `dfe_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const farmerUserId = body.farmerUserId || null;
    const farmerIdNumber = String(body.farmerIdNumber).trim();
    const farmerName = String(body.farmerName).trim();
    const farmName = String(body.farmName).trim();
    const phone = body.phone ? String(body.phone).trim() : null;
    const email = body.email ? String(body.email).trim() : null;
    const state = body.state ? String(body.state).trim() : 'Maharashtra';
    const district = body.district ? String(body.district).trim() : 'Kolhapur';
    const taluka = body.taluka ? String(body.taluka).trim() : null;
    const villageArea = body.villageArea ? String(body.villageArea).trim() : `${district} Center`;
    const pincode = body.pincode ? String(body.pincode).trim() : null;
    const milkType = ['COW', 'BUFFALO', 'MIXED'].includes(body.milkType) ? body.milkType : 'COW';
    const expectedDailyQuantity = parseFloat(body.expectedDailyQuantity) || 20.0;
    const agreedRatePerLiter = parseFloat(body.agreedRatePerLiter) || 42.0;
    const baseFatPercentage = parseFloat(body.baseFatPercentage) || 4.0;
    const baseSnfPercentage = parseFloat(body.baseSnfPercentage) || 8.5;
    const paymentMethod = body.paymentMethod || 'BANK_TRANSFER';
    const bankAccountNumber = body.bankAccountNumber || null;
    const bankIfsc = body.bankIfsc || null;
    const bankName = body.bankName || null;
    const upiId = body.upiId || null;
    const status = ['ACTIVE', 'PENDING_APPROVAL', 'SUSPENDED', 'REJECTED'].includes(body.status)
      ? body.status
      : 'ACTIVE';
    const joinRequestNotes = body.joinRequestNotes || null;
    const certificateNumber = body.certificateNumber ? String(body.certificateNumber).trim() : null;
    const certificateVerificationId = body.certificateVerificationId
      ? String(body.certificateVerificationId).trim()
      : null;

    await prisma.$executeRawUnsafe(
      `INSERT INTO \`dairy_farmer_enrollments\` (
        \`id\`, \`dairyUserId\`, \`farmerUserId\`, \`farmerIdNumber\`, \`farmerName\`, \`farmName\`,
        \`phone\`, \`email\`, \`state\`, \`district\`, \`taluka\`, \`villageArea\`, \`pincode\`,
        \`milkType\`, \`expectedDailyQuantity\`, \`agreedRatePerLiter\`, \`baseFatPercentage\`,
        \`baseSnfPercentage\`, \`paymentMethod\`, \`bankAccountNumber\`, \`bankIfsc\`, \`bankName\`,
        \`upiId\`, \`status\`, \`joinRequestNotes\`, \`certificateNumber\`, \`certificateVerificationId\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      dairyUserId,
      farmerUserId,
      farmerIdNumber,
      farmerName,
      farmName,
      phone,
      email,
      state,
      district,
      taluka,
      villageArea,
      pincode,
      milkType,
      expectedDailyQuantity,
      agreedRatePerLiter,
      baseFatPercentage,
      baseSnfPercentage,
      paymentMethod,
      bankAccountNumber,
      bankIfsc,
      bankName,
      upiId,
      status,
      joinRequestNotes,
      certificateNumber,
      certificateVerificationId,
    );

    response.status(201).json({
      data: {
        message:
          status === 'PENDING_APPROVAL'
            ? 'Join request submitted successfully'
            : 'Farmer enrolled successfully',
        enrollmentId: id,
      },
    });
  }),
);

dairyRouter.put(
  '/enrollments/:id',
  asyncHandler(async (request, response) => {
    const { id } = request.params;
    const body = request.body || {};

    const existing = await prisma.$queryRawUnsafe(
      'SELECT * FROM `dairy_farmer_enrollments` WHERE `id` = ?',
      id,
    );
    if (!existing || existing.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Farmer enrollment record not found.');
    }

    const current = existing[0];
    const farmerName =
      body.farmerName !== undefined ? String(body.farmerName).trim() : current.farmerName;
    const farmName = body.farmName !== undefined ? String(body.farmName).trim() : current.farmName;
    const phone = body.phone !== undefined ? String(body.phone).trim() : current.phone;
    const email = body.email !== undefined ? String(body.email).trim() : current.email;
    const state = body.state !== undefined ? String(body.state).trim() : current.state;
    const district = body.district !== undefined ? String(body.district).trim() : current.district;
    const taluka = body.taluka !== undefined ? String(body.taluka).trim() : current.taluka;
    const villageArea =
      body.villageArea !== undefined ? String(body.villageArea).trim() : current.villageArea;
    const milkType = body.milkType !== undefined ? body.milkType : current.milkType;
    const expectedDailyQuantity =
      body.expectedDailyQuantity !== undefined
        ? parseFloat(body.expectedDailyQuantity)
        : Number(current.expectedDailyQuantity);
    const agreedRatePerLiter =
      body.agreedRatePerLiter !== undefined
        ? parseFloat(body.agreedRatePerLiter)
        : Number(current.agreedRatePerLiter);
    const baseFatPercentage =
      body.baseFatPercentage !== undefined
        ? parseFloat(body.baseFatPercentage)
        : Number(current.baseFatPercentage);
    const baseSnfPercentage =
      body.baseSnfPercentage !== undefined
        ? parseFloat(body.baseSnfPercentage)
        : Number(current.baseSnfPercentage);
    const paymentMethod =
      body.paymentMethod !== undefined ? body.paymentMethod : current.paymentMethod;
    const bankAccountNumber =
      body.bankAccountNumber !== undefined ? body.bankAccountNumber : current.bankAccountNumber;
    const bankIfsc = body.bankIfsc !== undefined ? body.bankIfsc : current.bankIfsc;
    const bankName = body.bankName !== undefined ? body.bankName : current.bankName;
    const upiId = body.upiId !== undefined ? body.upiId : current.upiId;
    const status = body.status !== undefined ? body.status : current.status;
    const joinRequestNotes =
      body.joinRequestNotes !== undefined ? body.joinRequestNotes : current.joinRequestNotes;
    const certificateNumber =
      body.certificateNumber !== undefined
        ? body.certificateNumber
        : current.certificateNumber || null;
    const certificateVerificationId =
      body.certificateVerificationId !== undefined
        ? body.certificateVerificationId
        : current.certificateVerificationId || null;

    await prisma.$executeRawUnsafe(
      `UPDATE \`dairy_farmer_enrollments\` SET
        \`farmerName\` = ?, \`farmName\` = ?, \`phone\` = ?, \`email\` = ?, \`state\` = ?,
        \`district\` = ?, \`taluka\` = ?, \`villageArea\` = ?, \`milkType\` = ?,
        \`expectedDailyQuantity\` = ?, \`agreedRatePerLiter\` = ?, \`baseFatPercentage\` = ?,
        \`baseSnfPercentage\` = ?, \`paymentMethod\` = ?, \`bankAccountNumber\` = ?,
        \`bankIfsc\` = ?, \`bankName\` = ?, \`upiId\` = ?, \`status\` = ?, \`joinRequestNotes\` = ?,
        \`certificateNumber\` = ?, \`certificateVerificationId\` = ?
      WHERE \`id\` = ?`,
      farmerName,
      farmName,
      phone,
      email,
      state,
      district,
      taluka,
      villageArea,
      milkType,
      expectedDailyQuantity,
      agreedRatePerLiter,
      baseFatPercentage,
      baseSnfPercentage,
      paymentMethod,
      bankAccountNumber,
      bankIfsc,
      bankName,
      upiId,
      status,
      joinRequestNotes,
      certificateNumber,
      certificateVerificationId,
      id,
    );

    // If status changed to ACTIVE or REJECTED, notify the farmer
    if (status !== current.status) {
      let targetUserId = current.farmerUserId;
      if (!targetUserId && current.email) {
        const u = await prisma.user.findFirst({ where: { email: current.email } });
        targetUserId = u?.id || null;
      }

      if (targetUserId) {
        const dairyProfile = await prisma.dairyOwnerProfile.findFirst({
          where: { userId: current.dairyUserId },
        });
        const dairyDisplayName = dairyProfile?.dairyName || 'Registered Dairy';

        if (status === 'ACTIVE') {
          try {
            await prisma.alert.create({
              data: {
                userId: targetUserId,
                type: 'DAIRY_JOIN_REQUEST_APPROVED',
                title: 'Milk Supply Request Accepted! 🥛',
                message: `Congratulations! ${dairyDisplayName} reviewed your Milk Eligibility Certificate and accepted your supply request at ₹${agreedRatePerLiter}/L. You can now sell milk to this dairy!`,
                entityType: 'DAIRY_ENROLLMENT',
                entityId: id,
              },
            });
          } catch {
            /* ignore notification failures */
          }
        } else if (status === 'REJECTED') {
          try {
            await prisma.alert.create({
              data: {
                userId: targetUserId,
                type: 'DAIRY_JOIN_REQUEST_REJECTED',
                title: 'Milk Supply Request Status Update',
                message: `Your milk supply request to ${dairyDisplayName} was not accepted at this time.`,
                entityType: 'DAIRY_ENROLLMENT',
                entityId: id,
              },
            });
          } catch {
            /* ignore notification failures */
          }
        }
      }
    }

    response.json({
      data: {
        message:
          status === 'ACTIVE'
            ? 'Farmer request accepted and approved successfully'
            : 'Farmer enrollment updated successfully',
        status,
      },
    });
  }),
);

dairyRouter.put(
  '/enrollments/:id/status',
  asyncHandler(async (request, response) => {
    const { id } = request.params;
    const body = request.body || {};

    if (
      !body.status ||
      !['ACTIVE', 'REJECTED', 'PENDING_APPROVAL', 'SUSPENDED'].includes(body.status)
    ) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Valid status (ACTIVE, REJECTED) is required.');
    }

    const existing = await prisma.$queryRawUnsafe(
      'SELECT * FROM `dairy_farmer_enrollments` WHERE `id` = ?',
      id,
    );
    if (!existing || existing.length === 0) {
      throw new AppError(404, 'NOT_FOUND', 'Farmer enrollment record not found.');
    }

    const current = existing[0];
    const newStatus = body.status;
    const notes =
      body.notes || body.joinRequestNotes !== undefined
        ? body.notes || body.joinRequestNotes
        : current.joinRequestNotes;
    const agreedRate =
      body.agreedRatePerLiter !== undefined
        ? parseFloat(body.agreedRatePerLiter)
        : Number(current.agreedRatePerLiter);

    await prisma.$executeRawUnsafe(
      'UPDATE `dairy_farmer_enrollments` SET `status` = ?, `joinRequestNotes` = ?, `agreedRatePerLiter` = ?, `updatedAt` = NOW() WHERE `id` = ?',
      newStatus,
      notes,
      agreedRate,
      id,
    );

    // Notify farmer user if identifiable
    let targetUserId = current.farmerUserId;
    if (!targetUserId && current.email) {
      const u = await prisma.user.findFirst({ where: { email: current.email } });
      targetUserId = u?.id || null;
    }
    if (targetUserId) {
      try {
        await prisma.alert.create({
          data: {
            userId: targetUserId,
            type: newStatus === 'ACTIVE' ? 'ENROLLMENT_APPROVED' : 'ENROLLMENT_REJECTED',
            title: newStatus === 'ACTIVE' ? 'Dairy Supply Approved! 🎉' : 'Dairy Supply Update',
            message:
              newStatus === 'ACTIVE'
                ? 'Your milk supply enrollment has been approved! You can now drop off milk daily at the dairy.'
                : `Your supply request status was updated to ${newStatus}.`,
            entityType: 'DAIRY_ENROLLMENT',
            entityId: id,
          },
        });
      } catch {
        // ignore
      }
    }

    response.json({
      data: {
        enrollmentId: id,
        status: newStatus,
        agreedRatePerLiter: agreedRate,
        message: `Enrollment status updated to ${newStatus}.`,
      },
    });
  }),
);

dairyRouter.delete(
  '/enrollments/:id',
  asyncHandler(async (request, response) => {
    const { id } = request.params;
    await prisma.$executeRawUnsafe('DELETE FROM `dairy_farmer_enrollments` WHERE `id` = ?', id);
    response.json({ data: { message: 'Enrollment deleted successfully' } });
  }),
);

// =========================================================================
// 3B. FARMER-DAIRY INTERACTION: DISCOVERY, JOIN REQUESTS, CERTIFICATES & SALES
// =========================================================================

// List available verified dairies for farmers to connect
dairyRouter.get(
  '/dairies',
  asyncHandler(async (request, response) => {
    const profiles = await prisma.dairyOwnerProfile.findMany({
      where: { status: 'VERIFIED' },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const dairies = profiles.map((p) => ({
      id: p.id,
      userId: p.userId,
      dairyName: p.dairyName,
      fssaiLicenseNumber: p.fssaiLicenseNumber,
      state: p.state,
      district: p.district,
      operationalArea: p.operationalArea,
      dailyCapacityLiters: p.dailyCapacityLiters,
      contactEmail: p.user?.email || null,
      contactPhone: p.user?.phone || null,
      status: p.status,
    }));

    if (dairies.length === 0) {
      dairies.push({
        id: 'demo_dairy_1',
        userId: 'cmvgtpksi000lkjwcbaawbosb',
        dairyName: 'SK Dairy',
        fssaiLicenseNumber: 'FSSAI-MH-2024-8841',
        state: 'Maharashtra',
        district: 'Kolhapur',
        operationalArea: 'Sarnobatwadi Route 1',
        dailyCapacityLiters: 50000,
        contactEmail: 'dairy@gmail.com',
        contactPhone: '9822198765',
        status: 'VERIFIED',
      });
    }

    response.json({ data: { dairies } });
  }),
);

// Get farmer's active certificates and daily clearances to attach to join requests
dairyRouter.get(
  '/farmer/available-certificates',
  asyncHandler(async (request, response) => {
    const farmerUserId = request.user.id;
    const { farmId } = request.query;

    let targetFarmId = farmId;
    if (!targetFarmId) {
      const farm = await prisma.farm.findFirst({
        where: { createdById: farmerUserId },
      });
      targetFarmId = farm?.id;
    }

    const certificates = [];

    // 1. Fetch Daily Milk Collection Clearances
    const dailyClearances = await prisma.dailyMilkCollectionClearance.findMany({
      where: targetFarmId ? { evaluation: { farmId: targetFarmId } } : {},
      orderBy: { generatedAt: 'desc' },
      take: 10,
    });

    for (const dc of dailyClearances) {
      let payload = dc.canonicalPayload;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          /* ignore json parse fallback */
        }
      }
      certificates.push({
        id: dc.id,
        type: 'DAILY_CLEARANCE',
        certificateNumber: dc.clearanceNumber,
        verificationId: dc.verificationId,
        label: `Today's Daily Milk Clearance: ${dc.clearanceNumber} (${payload?.eligibleCount ?? 0} Eligible Animals)`,
        eligibleCount: payload?.eligibleCount ?? 0,
        applicableCount: payload?.applicableCount ?? 0,
        eligibleFrom: dc.generatedAt,
        status: 'ACTIVE',
        animals: (payload?.animals || []).map((a) => ({
          tagNumber: a.animalTag || a.tagNumber,
          name: a.animalName || a.name,
          status: a.eligibilityStatus,
        })),
        publicVerificationUrl: `/verify/daily-clearance/${dc.verificationId}`,
      });
    }

    // 2. Fetch individual Milk Eligibility Certificates
    const individualCerts = await prisma.milkEligibilityCertificate.findMany({
      where: targetFarmId ? { animal: { farmId: targetFarmId } } : {},
      include: { animal: { include: { species: true } } },
      orderBy: { issuedAt: 'desc' },
      take: 20,
    });

    for (const ic of individualCerts) {
      certificates.push({
        id: ic.id,
        type: 'INDIVIDUAL_CERTIFICATE',
        certificateNumber: ic.certificateNumber,
        verificationId: ic.verificationId,
        label: `Milk Eligibility Certificate: ${ic.certificateNumber} (Tag: ${ic.animal?.tagNumber || 'Unknown'})`,
        eligibleCount: 1,
        applicableCount: 1,
        eligibleFrom: ic.eligibleFrom,
        status: ic.status,
        animals: [
          {
            tagNumber: ic.animal?.tagNumber,
            name: ic.animal?.name,
            status: 'ELIGIBLE_FOR_MILK',
          },
        ],
        publicVerificationUrl: `/verify/certificate/${ic.verificationId}`,
      });
    }

    response.json({ data: { certificates } });
  }),
);

// Get farmer's own supply requests and dairy enrollments
dairyRouter.get(
  '/farmer/my-requests',
  asyncHandler(async (request, response) => {
    const farmerUserId = request.user.id;
    const farmerProfile = await prisma.farmerProfile.findFirst({
      where: { userId: farmerUserId },
    });
    const farmerIdNumber = farmerProfile?.farmerIdNumber || null;
    const email = request.user.email;

    const rows = await prisma.$queryRawUnsafe(
      `SELECT dfe.*, dop.dairyName, dop.fssaiLicenseNumber, dop.operationalArea as dairyArea, dop.district as dairyDistrict
       FROM \`dairy_farmer_enrollments\` dfe
       LEFT JOIN \`DairyOwnerProfile\` dop ON dop.userId = dfe.dairyUserId
       WHERE dfe.farmerUserId = ? OR (dfe.farmerIdNumber = ? AND ? IS NOT NULL) OR dfe.email = ?
       ORDER BY dfe.createdAt DESC`,
      farmerUserId,
      farmerIdNumber,
      farmerIdNumber,
      email,
    );

    const requests = rows.map((r) => ({
      ...r,
      expectedDailyQuantity: Number(r.expectedDailyQuantity || 0),
      agreedRatePerLiter: Number(r.agreedRatePerLiter || 0),
      baseFatPercentage: Number(r.baseFatPercentage || 0),
      baseSnfPercentage: Number(r.baseSnfPercentage || 0),
      dairyName:
        r.dairyName ||
        (r.dairyUserId === 'cmvgtpksi000lkjwcbaawbosb' ? 'SK Dairy' : 'Registered Dairy'),
    }));

    response.json({ data: { requests } });
  }),
);

// Farmer sends join request to dairy with certificate attached
dairyRouter.post(
  '/farmer/join-request',
  asyncHandler(async (request, response) => {
    const farmerUserId = request.user.id;
    const body = request.body || {};

    if (!body.dairyUserId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Target dairy is required.');
    }

    const farmerProfile = await prisma.farmerProfile.findFirst({
      where: { userId: farmerUserId },
    });
    const farm = await prisma.farm.findFirst({
      where: { createdById: farmerUserId },
    });

    const farmerName = String(
      body.farmerName ||
        request.user.fullName ||
        farmerProfile?.user?.fullName ||
        'Registered Farmer',
    ).trim();
    const farmName = String(
      body.farmName || farm?.name || farmerProfile?.farmName || 'Registered Farm',
    ).trim();
    const farmerIdNumber = String(
      body.farmerIdNumber ||
        farmerProfile?.farmerIdNumber ||
        `FRM-${farmerUserId.slice(-6).toUpperCase()}`,
    ).trim();
    const phone = body.phone || request.user.phone || null;
    const email = body.email || request.user.email || null;
    const state = body.state || farm?.state || farmerProfile?.state || 'Maharashtra';
    const district = body.district || farm?.district || farmerProfile?.district || 'Kolhapur';
    const taluka = body.taluka || farm?.taluka || farmerProfile?.taluka || null;
    const villageArea = body.villageArea || farm?.name ? `${farmName} Route` : `${district} Center`;
    const pincode = body.pincode || farm?.pincode || farmerProfile?.pincode || null;
    const milkType = ['COW', 'BUFFALO', 'MIXED'].includes(body.milkType) ? body.milkType : 'COW';
    const expectedDailyQuantity = parseFloat(body.expectedDailyQuantity) || 25.0;
    const agreedRatePerLiter = parseFloat(body.agreedRatePerLiter) || 42.5;
    const paymentMethod = body.paymentMethod || 'BANK_TRANSFER';
    const bankAccountNumber = body.bankAccountNumber || null;
    const bankIfsc = body.bankIfsc || null;
    const bankName = body.bankName || null;
    const upiId = body.upiId || null;
    const joinRequestNotes =
      body.joinRequestNotes || 'Farmer requesting milk supply agreement with verified certificate.';
    const certificateNumber = body.certificateNumber ? String(body.certificateNumber).trim() : null;
    const certificateVerificationId = body.certificateVerificationId
      ? String(body.certificateVerificationId).trim()
      : null;

    // Check if an existing enrollment/request exists for this dairy
    const existing = await prisma.$queryRawUnsafe(
      'SELECT id, status FROM `dairy_farmer_enrollments` WHERE `dairyUserId` = ? AND (`farmerUserId` = ? OR `farmerIdNumber` = ?) LIMIT 1',
      body.dairyUserId,
      farmerUserId,
      farmerIdNumber,
    );

    let id;
    if (existing && existing.length > 0) {
      id = existing[0].id;
      await prisma.$executeRawUnsafe(
        `UPDATE \`dairy_farmer_enrollments\` SET
          \`farmerName\` = ?, \`farmName\` = ?, \`phone\` = ?, \`email\` = ?,
          \`state\` = ?, \`district\` = ?, \`taluka\` = ?, \`villageArea\` = ?,
          \`milkType\` = ?, \`expectedDailyQuantity\` = ?, \`agreedRatePerLiter\` = ?,
          \`paymentMethod\` = ?, \`bankAccountNumber\` = ?, \`bankIfsc\` = ?, \`bankName\` = ?, \`upiId\` = ?,
          \`status\` = 'PENDING_APPROVAL', \`joinRequestNotes\` = ?,
          \`certificateNumber\` = ?, \`certificateVerificationId\` = ?, \`farmerUserId\` = ?
        WHERE \`id\` = ?`,
        farmerName,
        farmName,
        phone,
        email,
        state,
        district,
        taluka,
        villageArea,
        milkType,
        expectedDailyQuantity,
        agreedRatePerLiter,
        paymentMethod,
        bankAccountNumber,
        bankIfsc,
        bankName,
        upiId,
        joinRequestNotes,
        certificateNumber,
        certificateVerificationId,
        farmerUserId,
        id,
      );
    } else {
      id = `dfe_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO \`dairy_farmer_enrollments\` (
          \`id\`, \`dairyUserId\`, \`farmerUserId\`, \`farmerIdNumber\`, \`farmerName\`, \`farmName\`,
          \`phone\`, \`email\`, \`state\`, \`district\`, \`taluka\`, \`villageArea\`, \`pincode\`,
          \`milkType\`, \`expectedDailyQuantity\`, \`agreedRatePerLiter\`, \`baseFatPercentage\`,
          \`baseSnfPercentage\`, \`paymentMethod\`, \`bankAccountNumber\`, \`bankIfsc\`, \`bankName\`,
          \`upiId\`, \`status\`, \`joinRequestNotes\`, \`certificateNumber\`, \`certificateVerificationId\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 4.2, 8.6, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', ?, ?, ?)`,
        id,
        body.dairyUserId,
        farmerUserId,
        farmerIdNumber,
        farmerName,
        farmName,
        phone,
        email,
        state,
        district,
        taluka,
        villageArea,
        pincode,
        milkType,
        expectedDailyQuantity,
        agreedRatePerLiter,
        paymentMethod,
        bankAccountNumber,
        bankIfsc,
        bankName,
        upiId,
        joinRequestNotes,
        certificateNumber,
        certificateVerificationId,
      );
    }

    // Alert the dairy operator
    try {
      await prisma.alert.create({
        data: {
          userId: body.dairyUserId,
          type: 'DAIRY_JOIN_REQUEST',
          title: 'New Milk Supply Request Received 📬',
          message: `Farmer ${farmerName} (${farmName}) has sent a milk supply request with Certificate #${certificateNumber || 'Attached'}. Please review the certificate and accept.`,
          entityType: 'DAIRY_ENROLLMENT',
          entityId: id,
        },
      });
    } catch {
      /* ignore alert creation failures */
    }

    response.status(201).json({
      data: {
        message: 'Milk supply request submitted to dairy successfully.',
        enrollmentId: id,
        status: 'PENDING_APPROVAL',
      },
    });
  }),
);

// Farmer sells milk to an approved dairy
dairyRouter.post(
  '/farmer/sell-milk',
  asyncHandler(async (request, response) => {
    const farmerUserId = request.user.id;
    const body = request.body || {};

    if (!body.dairyUserId || !body.quantityLiters) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Target dairy and Quantity (Liters) are required.',
      );
    }

    const farmerProfile = await prisma.farmerProfile.findFirst({
      where: { userId: farmerUserId },
    });
    const farmerIdNumber = body.farmerIdNumber || farmerProfile?.farmerIdNumber || null;

    // Verify active enrollment with this dairy
    const enrollments = await prisma.$queryRawUnsafe(
      'SELECT * FROM `dairy_farmer_enrollments` WHERE `dairyUserId` = ? AND (`farmerUserId` = ? OR (`farmerIdNumber` = ? AND ? IS NOT NULL)) LIMIT 1',
      body.dairyUserId,
      farmerUserId,
      farmerIdNumber,
      farmerIdNumber,
    );

    if (!enrollments || enrollments.length === 0) {
      throw new AppError(
        403,
        'NOT_ENROLLED',
        'You must first send a join request to this dairy and be accepted before selling milk.',
      );
    }

    const enr = enrollments[0];
    if (enr.status !== 'ACTIVE') {
      throw new AppError(
        403,
        'REQUEST_PENDING',
        `Cannot sell milk: Your supply request to this dairy is currently "${enr.status}". The dairy operator must review your certificate and accept your request first.`,
      );
    }

    const quantityLiters = parseFloat(body.quantityLiters);
    if (isNaN(quantityLiters) || quantityLiters <= 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Quantity must be a positive number.');
    }

    const ratePerLiter = parseFloat(body.ratePerLiter) || Number(enr.agreedRatePerLiter) || 42.5;
    const totalCost = parseFloat((quantityLiters * ratePerLiter).toFixed(2));
    const milkType = ['COW', 'BUFFALO', 'MIXED'].includes(body.milkType)
      ? body.milkType
      : enr.milkType || 'COW';
    const fatPercentage = parseFloat(body.fatPercentage) || Number(enr.baseFatPercentage) || 4.2;
    const snfPercentage = parseFloat(body.snfPercentage) || Number(enr.baseSnfPercentage) || 8.6;
    const shift = body.shift === 'EVENING' ? 'EVENING' : 'MORNING';
    const collectionDate = body.collectionDate || new Date().toISOString().split('T')[0];
    const id = `intake_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO \`dairy_milk_intakes\` (
        \`id\`, \`dairyUserId\`, \`enrollmentId\`, \`farmerIdNumber\`, \`farmerName\`, \`farmName\`,
        \`villageArea\`, \`collectionDate\`, \`shift\`, \`milkType\`, \`quantityLiters\`,
        \`fatPercentage\`, \`snfPercentage\`, \`ratePerLiter\`, \`totalCost\`, \`storageTank\`,
        \`eligibilityStatus\`, \`paymentStatus\`, \`qualityGrade\`, \`notes\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CLEARED', 'PENDING', 'GRADE_A', ?)`,
      id,
      body.dairyUserId,
      enr.id,
      enr.farmerIdNumber,
      enr.farmerName,
      enr.farmName,
      enr.villageArea,
      collectionDate,
      shift,
      milkType,
      quantityLiters,
      fatPercentage,
      snfPercentage,
      ratePerLiter,
      totalCost,
      milkType === 'BUFFALO' ? 'Silo-2 (Raw Buffalo)' : 'Silo-1 (Raw Cow)',
      body.notes || 'Recorded via farmer milk supply terminal with certified herd clearance.',
    );

    // Alert dairy operator
    try {
      await prisma.alert.create({
        data: {
          userId: body.dairyUserId,
          type: 'MILK_INTAKE_DELIVERED',
          title: 'Milk Supply Received 🥛',
          message: `Farmer ${enr.farmerName} has supplied ${quantityLiters}L (${milkType}) on ${collectionDate} (${shift}). Total payout: ₹${totalCost}.`,
          entityType: 'DAIRY_INTAKE',
          entityId: id,
        },
      });
    } catch {
      /* ignore alert creation failures */
    }

    response.status(201).json({
      data: {
        message: `Successfully sold ${quantityLiters}L milk to dairy! Payout: ₹${totalCost}.`,
        intakeId: id,
        quantityLiters,
        ratePerLiter,
        totalCost,
        collectionDate,
        shift,
      },
    });
  }),
);

// Farmer's milk sales history
dairyRouter.get(
  '/farmer/sales-history',
  asyncHandler(async (request, response) => {
    const farmerUserId = request.user.id;
    const farmerProfile = await prisma.farmerProfile.findFirst({
      where: { userId: farmerUserId },
    });
    const farmerIdNumber = farmerProfile?.farmerIdNumber || null;

    const rows = await prisma.$queryRawUnsafe(
      `SELECT dmi.*, dop.dairyName
       FROM \`dairy_milk_intakes\` dmi
       LEFT JOIN \`DairyOwnerProfile\` dop ON dop.userId = dmi.dairyUserId
       LEFT JOIN \`dairy_farmer_enrollments\` dfe ON dfe.id = dmi.enrollmentId
       WHERE (dfe.farmerUserId = ? OR dmi.farmerIdNumber = ?)
       ORDER BY dmi.collectionDate DESC, dmi.createdAt DESC
       LIMIT 100`,
      farmerUserId,
      farmerIdNumber || 'NONE',
    );

    const sales = rows.map((r) => ({
      ...r,
      quantityLiters: Number(r.quantityLiters || 0),
      fatPercentage: Number(r.fatPercentage || 0),
      snfPercentage: Number(r.snfPercentage || 0),
      ratePerLiter: Number(r.ratePerLiter || 0),
      totalCost: Number(r.totalCost || 0),
      dairyName:
        r.dairyName ||
        (r.dairyUserId === 'cmvgtpksi000lkjwcbaawbosb' ? 'SK Dairy' : 'Registered Dairy'),
    }));

    response.json({ data: { sales } });
  }),
);

// Dairy operator certificate inspection endpoint
dairyRouter.get(
  '/certificates/verify/:verificationId',
  asyncHandler(async (request, response) => {
    const { verificationId } = request.params;

    // 1. Check daily clearance
    const dailyClearance = await prisma.dailyMilkCollectionClearance.findFirst({
      where: {
        OR: [{ verificationId }, { clearanceNumber: verificationId }],
      },
      include: { generatedBy: { select: { fullName: true, email: true } } },
    });

    if (dailyClearance) {
      let payload = dailyClearance.canonicalPayload;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          /* ignore json parse fallback */
        }
      }

      return response.json({
        data: {
          type: 'DAILY_CLEARANCE',
          certificateNumber: dailyClearance.clearanceNumber,
          verificationId: dailyClearance.verificationId,
          status: 'ACTIVE',
          documentIntegrity: 'VERIFIED',
          contentHashSha256: dailyClearance.contentHashSha256,
          farmName: payload?.farm?.name || 'Registered Farm',
          businessDate: payload?.businessDate || dailyClearance.generatedAt,
          eligibleCount: payload?.eligibleCount ?? 0,
          applicableCount: payload?.applicableCount ?? 0,
          animals: (payload?.animals || []).map((a) => ({
            tagNumber: a.animalTag || a.tagNumber,
            name: a.animalName || a.name,
            status: a.eligibilityStatus,
            blockingReason: a.blockingReason || null,
          })),
          disclaimer: dailyClearance.disclaimer,
          generatedAt: dailyClearance.generatedAt,
          publicUrl: `/verify/daily-clearance/${dailyClearance.verificationId}`,
        },
      });
    }

    // 2. Check individual animal certificate
    const cert = await prisma.milkEligibilityCertificate.findFirst({
      where: {
        OR: [{ verificationId }, { certificateNumber: verificationId }, { id: verificationId }],
      },
      include: {
        animal: {
          include: { farm: true, species: true },
        },
      },
    });

    if (cert) {
      return response.json({
        data: {
          type: 'MILK_ELIGIBILITY_CERTIFICATE',
          certificateNumber: cert.certificateNumber,
          verificationId: cert.verificationId,
          status: cert.status,
          documentIntegrity: 'VERIFIED',
          farmName: cert.animal?.farm?.name || 'Registered Farm',
          animalTag: cert.animal?.tagNumber,
          species: cert.animal?.species?.canonicalName || 'Cattle',
          eligibleFrom: cert.eligibleFrom,
          disclaimer: cert.disclaimer,
          issuedAt: cert.issuedAt,
          animals: [
            {
              tagNumber: cert.animal?.tagNumber,
              name: cert.animal?.name,
              status: 'ELIGIBLE_FOR_MILK',
              blockingReason: null,
            },
          ],
          publicUrl: `/verify/certificate/${cert.verificationId}`,
        },
      });
    }

    throw new AppError(
      404,
      'NOT_FOUND',
      `Certificate with verification ID or Number "${verificationId}" was not found.`,
    );
  }),
);

// =========================================================================
// 4. INVENTORY MANAGEMENT: MILK INTAKES (COLLECTION PER FARMER)
// =========================================================================
dairyRouter.get(
  '/inventory/intakes',
  asyncHandler(async (request, response) => {
    const { farmerIdNumber, area, date, shift, milkType } = request.query;
    await resolveDairyUserId(request);

    let query = 'SELECT * FROM `dairy_milk_intakes` WHERE 1=1';
    const params = [];

    if (farmerIdNumber && farmerIdNumber.trim()) {
      query += ' AND `farmerIdNumber` = ?';
      params.push(farmerIdNumber.trim());
    }

    if (area && area.trim()) {
      query += ' AND `villageArea` LIKE ?';
      params.push(`%${area.trim()}%`);
    }

    if (date) {
      query += ' AND `collectionDate` = ?';
      params.push(date);
    }

    if (shift && shift !== 'ALL') {
      query += ' AND `shift` = ?';
      params.push(shift);
    }

    if (milkType && milkType !== 'ALL') {
      query += ' AND `milkType` = ?';
      params.push(milkType);
    }

    query += ' ORDER BY `collectionDate` DESC, `createdAt` DESC LIMIT 200';

    const rows = await prisma.$queryRawUnsafe(query, ...params);

    const intakes = rows.map((r) => ({
      ...r,
      quantityLiters: Number(r.quantityLiters || 0),
      fatPercentage: Number(r.fatPercentage || 0),
      snfPercentage: Number(r.snfPercentage || 0),
      ratePerLiter: Number(r.ratePerLiter || 0),
      totalCost: Number(r.totalCost || 0),
      collectionDate: r.collectionDate
        ? new Date(r.collectionDate).toISOString().split('T')[0]
        : null,
    }));

    response.json({ data: { intakes } });
  }),
);

dairyRouter.post(
  '/inventory/intakes',
  asyncHandler(async (request, response) => {
    const dairyUserId = await resolveDairyUserId(request);
    const body = request.body || {};

    if (!body.farmerIdNumber || !body.quantityLiters || !body.ratePerLiter) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Farmer ID, Quantity (Liters), and Rate per Liter are required.',
      );
    }

    const id = `intake_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const farmerIdNumber = String(body.farmerIdNumber).trim();
    const farmerName = String(body.farmerName || 'Supplying Farmer').trim();
    const farmName = body.farmName ? String(body.farmName).trim() : null;
    const villageArea = body.villageArea ? String(body.villageArea).trim() : 'Local Route';
    const collectionDate = body.collectionDate || new Date().toISOString().split('T')[0];
    const shift = body.shift === 'EVENING' ? 'EVENING' : 'MORNING';
    const milkType = ['COW', 'BUFFALO', 'MIXED'].includes(body.milkType) ? body.milkType : 'COW';
    const quantityLiters = parseFloat(body.quantityLiters);
    const fatPercentage = parseFloat(body.fatPercentage) || 4.2;
    const snfPercentage = parseFloat(body.snfPercentage) || 8.6;
    const ratePerLiter = parseFloat(body.ratePerLiter);
    const totalCost = parseFloat((quantityLiters * ratePerLiter).toFixed(2));
    const storageTank = body.storageTank || 'Silo-1 (Raw Cow)';
    const qualityGrade =
      body.qualityGrade || (fatPercentage >= 4.2 && snfPercentage >= 8.5 ? 'GRADE_A' : 'GRADE_B');
    const paymentStatus = ['PAID', 'PENDING'].includes(body.paymentStatus)
      ? body.paymentStatus
      : 'PENDING';
    const notes = body.notes || 'Recorded via dairy intake terminal.';

    // Check farmer enrollment status - cannot accept milk if pending review
    const enrollmentCheck = await prisma.$queryRawUnsafe(
      'SELECT status FROM `dairy_farmer_enrollments` WHERE `dairyUserId` = ? AND `farmerIdNumber` = ? LIMIT 1',
      dairyUserId,
      farmerIdNumber,
    );
    if (enrollmentCheck && enrollmentCheck.length > 0) {
      if (enrollmentCheck[0].status === 'PENDING_APPROVAL') {
        throw new AppError(
          400,
          'ENROLLMENT_PENDING',
          'Cannot collect milk: Farmer join request is still pending approval. You must inspect the certificate and accept the farmer first.',
        );
      }
      if (enrollmentCheck[0].status === 'REJECTED' || enrollmentCheck[0].status === 'SUSPENDED') {
        throw new AppError(
          400,
          'ENROLLMENT_INACTIVE',
          `Cannot collect milk: Farmer enrollment status is "${enrollmentCheck[0].status}".`,
        );
      }
    }

    // Check withdrawal safety status against farmer's animals if available
    let eligibilityStatus = 'CLEARED';
    try {
      const farmerProfile = await prisma.farmerProfile.findFirst({
        where: { farmerIdNumber },
        include: {
          user: {
            include: {
              farmsCreated: {
                include: {
                  animals: {
                    include: {
                      treatments: {
                        where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
                        take: 5,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (farmerProfile?.user?.farmsCreated?.[0]?.animals) {
        for (const a of farmerProfile.user.farmsCreated[0].animals) {
          const st = calculateAnimalMilkStatus(a);
          if (!st.isEligible) {
            eligibilityStatus = 'CAUTION_ACTIVE_WITHDRAWAL';
            break;
          }
        }
      }
    } catch {
      // fallback
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO \`dairy_milk_intakes\` (
        \`id\`, \`dairyUserId\`, \`enrollmentId\`, \`farmerIdNumber\`, \`farmerName\`, \`farmName\`,
        \`villageArea\`, \`collectionDate\`, \`shift\`, \`milkType\`, \`quantityLiters\`,
        \`fatPercentage\`, \`snfPercentage\`, \`ratePerLiter\`, \`totalCost\`, \`storageTank\`,
        \`eligibilityStatus\`, \`paymentStatus\`, \`qualityGrade\`, \`notes\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      dairyUserId,
      body.enrollmentId || null,
      farmerIdNumber,
      farmerName,
      farmName,
      villageArea,
      collectionDate,
      shift,
      milkType,
      quantityLiters,
      fatPercentage,
      snfPercentage,
      ratePerLiter,
      totalCost,
      storageTank,
      eligibilityStatus,
      paymentStatus,
      qualityGrade,
      notes,
    );

    response.status(201).json({
      data: {
        message: 'Milk collection intake logged successfully',
        intakeId: id,
        totalCost,
        eligibilityStatus,
      },
    });
  }),
);

dairyRouter.delete(
  '/inventory/intakes/:id',
  asyncHandler(async (request, response) => {
    const { id } = request.params;
    await prisma.$executeRawUnsafe('DELETE FROM `dairy_milk_intakes` WHERE `id` = ?', id);
    response.json({ data: { message: 'Intake record deleted successfully' } });
  }),
);

// =========================================================================
// 5. INVENTORY MANAGEMENT: MILK SALES & OUTFLOW
// =========================================================================
dairyRouter.get(
  '/inventory/sales',
  asyncHandler(async (request, response) => {
    const { buyerType, milkType, date } = request.query;
    await resolveDairyUserId(request);

    let query = 'SELECT * FROM `dairy_milk_sales` WHERE 1=1';
    const params = [];

    if (buyerType && buyerType !== 'ALL') {
      query += ' AND `buyerType` = ?';
      params.push(buyerType);
    }

    if (milkType && milkType !== 'ALL') {
      query += ' AND `milkType` = ?';
      params.push(milkType);
    }

    if (date) {
      query += ' AND `saleDate` = ?';
      params.push(date);
    }

    query += ' ORDER BY `saleDate` DESC, `createdAt` DESC LIMIT 200';

    const rows = await prisma.$queryRawUnsafe(query, ...params);

    const sales = rows.map((r) => ({
      ...r,
      quantityLiters: Number(r.quantityLiters || 0),
      pricePerLiter: Number(r.pricePerLiter || 0),
      totalAmount: Number(r.totalAmount || 0),
      saleDate: r.saleDate ? new Date(r.saleDate).toISOString().split('T')[0] : null,
    }));

    response.json({ data: { sales } });
  }),
);

dairyRouter.post(
  '/inventory/sales',
  asyncHandler(async (request, response) => {
    const dairyUserId = await resolveDairyUserId(request);
    const body = request.body || {};

    if (!body.buyerName || !body.quantityLiters || !body.pricePerLiter) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Buyer Name, Quantity (Liters), and Price per Liter are required.',
      );
    }

    const id = `sale_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const saleDate = body.saleDate || new Date().toISOString().split('T')[0];
    const invoiceNumber =
      body.invoiceNumber ||
      `INV-${saleDate.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const buyerName = String(body.buyerName).trim();
    const buyerType = [
      'RETAIL_CONSUMER',
      'COMMERCIAL_SHOP',
      'WHOLESALE_DISTRIBUTOR',
      'PROCESSING_PLANT',
    ].includes(body.buyerType)
      ? body.buyerType
      : 'RETAIL_CONSUMER';
    const milkType = body.milkType || 'COW';
    const quantityLiters = parseFloat(body.quantityLiters);
    const pricePerLiter = parseFloat(body.pricePerLiter);
    const totalAmount = parseFloat((quantityLiters * pricePerLiter).toFixed(2));
    const dispensedFromTank = body.dispensedFromTank || 'Tank A (Chilled Bulk)';
    const paymentStatus = body.paymentStatus === 'PENDING' ? 'PENDING' : 'PAID';
    const paymentMethod = body.paymentMethod || 'UPI';
    const notes = body.notes || 'Counter / delivery dispatch recorded.';

    await prisma.$executeRawUnsafe(
      `INSERT INTO \`dairy_milk_sales\` (
        \`id\`, \`dairyUserId\`, \`saleDate\`, \`invoiceNumber\`, \`buyerName\`, \`buyerType\`,
        \`milkType\`, \`quantityLiters\`, \`pricePerLiter\`, \`totalAmount\`, \`dispensedFromTank\`,
        \`paymentStatus\`, \`paymentMethod\`, \`notes\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      dairyUserId,
      saleDate,
      invoiceNumber,
      buyerName,
      buyerType,
      milkType,
      quantityLiters,
      pricePerLiter,
      totalAmount,
      dispensedFromTank,
      paymentStatus,
      paymentMethod,
      notes,
    );

    response.status(201).json({
      data: {
        message: 'Milk sale recorded successfully',
        saleId: id,
        invoiceNumber,
        totalAmount,
      },
    });
  }),
);

dairyRouter.delete(
  '/inventory/sales/:id',
  asyncHandler(async (request, response) => {
    const { id } = request.params;
    await prisma.$executeRawUnsafe('DELETE FROM `dairy_milk_sales` WHERE `id` = ?', id);
    response.json({ data: { message: 'Sales record deleted successfully' } });
  }),
);

// =========================================================================
// 6. INVENTORY MANAGEMENT: SILOS & COOLING TANKS STOCK
// =========================================================================
dairyRouter.get(
  '/inventory/tanks',
  asyncHandler(async (request, response) => {
    await resolveDairyUserId(request);

    // Sum total milk intake liters from current present database records
    const intakeRows = await prisma.$queryRawUnsafe(
      'SELECT `storageTank`, `milkType`, SUM(`quantityLiters`) as totalIn FROM `dairy_milk_intakes` GROUP BY `storageTank`, `milkType`',
    );

    // Sum total sales liters dispensed from current present database records
    const salesRows = await prisma.$queryRawUnsafe(
      'SELECT `dispensedFromTank`, SUM(`quantityLiters`) as totalOut FROM `dairy_milk_sales` GROUP BY `dispensedFromTank`',
    );

    const outMap = {};
    for (const s of salesRows) {
      outMap[s.dispensedFromTank] = Number(s.totalOut || 0);
    }

    const defaultTanks = [
      {
        id: 'silo-1',
        name: 'Silo-1 (Raw Cow)',
        capacityLiters: 2000,
        temperatureC: 3.8,
        milkType: 'COW',
      },
      {
        id: 'silo-2',
        name: 'Silo-2 (Buffalo)',
        capacityLiters: 1500,
        temperatureC: 4.0,
        milkType: 'BUFFALO',
      },
      {
        id: 'tank-a',
        name: 'Tank A (Chilled Bulk)',
        capacityLiters: 1200,
        temperatureC: 3.5,
        milkType: 'COW',
      },
      {
        id: 'tank-b',
        name: 'Tank B (Collection Buffer)',
        capacityLiters: 800,
        temperatureC: 4.2,
        milkType: 'MIXED',
      },
    ];

    let grandTotalIn = 0;
    let grandTotalOut = 0;

    const tanks = defaultTanks.map((tank) => {
      const matchingIntakes = intakeRows.filter((r) => {
        if (r.storageTank === tank.name) return true;
        if (
          tank.id === 'silo-1' &&
          (r.storageTank === 'Silo-1' || r.storageTank?.startsWith('Silo-1'))
        )
          return true;
        if (
          tank.id === 'silo-2' &&
          (r.storageTank === 'Silo-2' || r.storageTank?.startsWith('Silo-2'))
        )
          return true;
        return false;
      });
      const totalIn = matchingIntakes.reduce((acc, r) => acc + Number(r.totalIn || 0), 0);
      const totalOut = outMap[tank.name] || 0;
      grandTotalIn += totalIn;
      grandTotalOut += totalOut;
      const currentStockLiters = Math.max(0, parseFloat((totalIn - totalOut).toFixed(2)));
      const utilizationPercent = Math.min(
        100,
        parseFloat(((currentStockLiters / tank.capacityLiters) * 100).toFixed(1)),
      );

      return {
        ...tank,
        totalInflowLiters: totalIn,
        totalOutflowLiters: totalOut,
        currentStockLiters,
        utilizationPercent,
      };
    });

    const netStockLiters = Math.max(0, parseFloat((grandTotalIn - grandTotalOut).toFixed(2)));

    response.json({
      data: {
        tanks,
        summary: {
          totalCapacityLiters: defaultTanks.reduce((acc, t) => acc + t.capacityLiters, 0),
          netStockLiters,
          totalInflowLiters: grandTotalIn,
          totalOutflowLiters: grandTotalOut,
        },
      },
    });
  }),
);

// =========================================================================
// 7. COMPREHENSIVE DAIRY OPERATOR ANALYTICS (DAILY, MONTHLY, METRICS)
// =========================================================================
dairyRouter.get(
  '/analytics',
  asyncHandler(async (request, response) => {
    await resolveDairyUserId(request);
    const { date } = request.query;

    const toYMD = (val) => {
      if (!val) return '';
      if (typeof val === 'string') return val.split('T')[0];
      if (val instanceof Date) return val.toISOString().split('T')[0];
      return '';
    };

    const now = new Date();
    const serverLocalDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayStr = typeof date === 'string' && date.trim() ? date.trim() : serverLocalDate;
    const currentMonthPrefix = todayStr.slice(0, 7); // 'YYYY-MM'

    // 1. All-time summary based purely on current present data in database
    const allIntakes = await prisma.$queryRawUnsafe(
      'SELECT `collectionDate`, `farmerIdNumber`, `farmerName`, `villageArea`, `quantityLiters`, `totalCost`, `fatPercentage`, `snfPercentage`, `shift`, `eligibilityStatus` FROM `dairy_milk_intakes` ORDER BY `collectionDate` ASC',
    );

    const allSales = await prisma.$queryRawUnsafe(
      'SELECT `saleDate`, `invoiceNumber`, `buyerName`, `buyerType`, `quantityLiters`, `totalAmount`, `paymentStatus` FROM `dairy_milk_sales` ORDER BY `saleDate` ASC',
    );

    // Calculate Today's KPIs
    const todayIntakes = allIntakes.filter((r) => toYMD(r.collectionDate) === todayStr);
    const todaySales = allSales.filter((r) => toYMD(r.saleDate) === todayStr);

    const todaySalesCount = todaySales.length;
    const todaySalesLiters = todaySales.reduce((acc, r) => acc + Number(r.quantityLiters || 0), 0);
    const todaySalesRevenue = todaySales.reduce((acc, r) => acc + Number(r.totalAmount || 0), 0);
    const todayIntakeLiters = todayIntakes.reduce(
      (acc, r) => acc + Number(r.quantityLiters || 0),
      0,
    );
    const todayIntakeCost = todayIntakes.reduce((acc, r) => acc + Number(r.totalCost || 0), 0);
    const todayNetProfit = todaySalesRevenue - todayIntakeCost;

    // Calculate Monthly KPIs
    const monthIntakes = allIntakes.filter((r) =>
      toYMD(r.collectionDate).startsWith(currentMonthPrefix),
    );
    const monthSales = allSales.filter((r) => toYMD(r.saleDate).startsWith(currentMonthPrefix));

    const monthSalesCount = monthSales.length;
    const monthSalesLiters = monthSales.reduce((acc, r) => acc + Number(r.quantityLiters || 0), 0);
    const monthSalesRevenue = monthSales.reduce((acc, r) => acc + Number(r.totalAmount || 0), 0);
    const monthIntakeLiters = monthIntakes.reduce(
      (acc, r) => acc + Number(r.quantityLiters || 0),
      0,
    );
    const monthIntakeCost = monthIntakes.reduce((acc, r) => acc + Number(r.totalCost || 0), 0);
    const monthNetProfit = monthSalesRevenue - monthIntakeCost;

    // Overall metrics
    const totalIntakeLitersAll = allIntakes.reduce(
      (acc, r) => acc + Number(r.quantityLiters || 0),
      0,
    );
    const totalIntakeCostAll = allIntakes.reduce((acc, r) => acc + Number(r.totalCost || 0), 0);
    const totalSalesLitersAll = allSales.reduce((acc, r) => acc + Number(r.quantityLiters || 0), 0);
    const totalSalesRevenueAll = allSales.reduce((acc, r) => acc + Number(r.totalAmount || 0), 0);
    const currentStockLiters = Math.max(0, totalIntakeLitersAll - totalSalesLitersAll);

    // Active farmers count
    const uniqueFarmers = new Set(allIntakes.map((r) => r.farmerIdNumber));
    const activeSupplyingFarmersCount = uniqueFarmers.size;

    // AMU Clearance rate
    const clearedIntakes = allIntakes.filter((r) => r.eligibilityStatus === 'CLEARED');
    const amuComplianceRate =
      allIntakes.length > 0
        ? parseFloat(((clearedIntakes.length / allIntakes.length) * 100).toFixed(1))
        : 100;

    // Daily Time-series for charts based strictly on dates present in database
    const presentDatesSet = new Set();
    presentDatesSet.add(todayStr); // Always show today
    for (const r of allIntakes) {
      const d = toYMD(r.collectionDate);
      if (d) presentDatesSet.add(d);
    }
    for (const s of allSales) {
      const d = toYMD(s.saleDate);
      if (d) presentDatesSet.add(d);
    }

    const sortedDates = Array.from(presentDatesSet).sort();
    const dailyTrends = sortedDates.map((dateStr) => {
      const dayIntakes = allIntakes.filter((r) => toYMD(r.collectionDate) === dateStr);
      const daySales = allSales.filter((s) => toYMD(s.saleDate) === dateStr);

      const intakeLiters = dayIntakes.reduce((acc, r) => acc + Number(r.quantityLiters || 0), 0);
      const intakeCost = dayIntakes.reduce((acc, r) => acc + Number(r.totalCost || 0), 0);
      const salesLiters = daySales.reduce((acc, s) => acc + Number(s.quantityLiters || 0), 0);
      const salesRevenue = daySales.reduce((acc, s) => acc + Number(s.totalAmount || 0), 0);

      return {
        date: dateStr,
        dayLabel: new Date(dateStr).toLocaleDateString('en-IN', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        intakeLiters: parseFloat(intakeLiters.toFixed(1)),
        intakeCost: parseFloat(intakeCost.toFixed(2)),
        salesLiters: parseFloat(salesLiters.toFixed(1)),
        salesRevenue: parseFloat(salesRevenue.toFixed(2)),
        netProfit: parseFloat((salesRevenue - intakeCost).toFixed(2)),
      };
    });

    // Top Supplying Farmers Leaderboard
    const farmerMap = {};
    for (const r of allIntakes) {
      const key = r.farmerIdNumber;
      if (!farmerMap[key]) {
        farmerMap[key] = {
          farmerIdNumber: key,
          farmerName: r.farmerName,
          villageArea: r.villageArea || 'Area',
          totalLiters: 0,
          totalPayout: 0,
          fatSum: 0,
          snfSum: 0,
          count: 0,
        };
      }
      farmerMap[key].totalLiters += Number(r.quantityLiters || 0);
      farmerMap[key].totalPayout += Number(r.totalCost || 0);
      farmerMap[key].fatSum += Number(r.fatPercentage || 0);
      farmerMap[key].snfSum += Number(r.snfPercentage || 0);
      farmerMap[key].count += 1;
    }

    const topFarmers = Object.values(farmerMap)
      .map((f) => ({
        farmerIdNumber: f.farmerIdNumber,
        farmerName: f.farmerName,
        villageArea: f.villageArea,
        totalLiters: parseFloat(f.totalLiters.toFixed(1)),
        totalPayout: parseFloat(f.totalPayout.toFixed(2)),
        avgFat: parseFloat((f.fatSum / f.count).toFixed(2)),
        avgSnf: parseFloat((f.snfSum / f.count).toFixed(2)),
        deliveriesCount: f.count,
      }))
      .sort((a, b) => b.totalLiters - a.totalLiters);

    // Area Distribution
    const areaMap = {};
    for (const r of allIntakes) {
      const area = r.villageArea || 'Unassigned Area';
      if (!areaMap[area]) {
        areaMap[area] = { area, totalLiters: 0, deliveries: 0 };
      }
      areaMap[area].totalLiters += Number(r.quantityLiters || 0);
      areaMap[area].deliveries += 1;
    }

    const areaContributions = Object.values(areaMap)
      .map((a) => ({
        area: a.area,
        totalLiters: parseFloat(a.totalLiters.toFixed(1)),
        deliveries: a.deliveries,
        percentage:
          totalIntakeLitersAll > 0
            ? parseFloat(((a.totalLiters / totalIntakeLitersAll) * 100).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.totalLiters - a.totalLiters);

    // Buyer Type Distribution
    const buyerMap = {};
    for (const s of allSales) {
      const bt = s.buyerType || 'RETAIL_CONSUMER';
      if (!buyerMap[bt]) buyerMap[bt] = { type: bt, liters: 0, revenue: 0, count: 0 };
      buyerMap[bt].liters += Number(s.quantityLiters || 0);
      buyerMap[bt].revenue += Number(s.totalAmount || 0);
      buyerMap[bt].count += 1;
    }

    response.json({
      data: {
        summary: {
          today: {
            salesCount: todaySalesCount,
            salesLiters: parseFloat(todaySalesLiters.toFixed(1)),
            salesRevenue: parseFloat(todaySalesRevenue.toFixed(2)),
            intakeLiters: parseFloat(todayIntakeLiters.toFixed(1)),
            intakeCost: parseFloat(todayIntakeCost.toFixed(2)),
            netProfit: parseFloat(todayNetProfit.toFixed(2)),
          },
          month: {
            salesCount: monthSalesCount,
            salesLiters: parseFloat(monthSalesLiters.toFixed(1)),
            salesRevenue: parseFloat(monthSalesRevenue.toFixed(2)),
            intakeLiters: parseFloat(monthIntakeLiters.toFixed(1)),
            intakeCost: parseFloat(monthIntakeCost.toFixed(2)),
            netProfit: parseFloat(monthNetProfit.toFixed(2)),
          },
          allTime: {
            totalSalesRevenue: parseFloat(totalSalesRevenueAll.toFixed(2)),
            totalProcurementCost: parseFloat(totalIntakeCostAll.toFixed(2)),
            currentStockLiters: parseFloat(currentStockLiters.toFixed(1)),
            activeSupplyingFarmersCount,
            amuComplianceRate,
          },
        },
        dailyTrends,
        topFarmers,
        areaContributions,
        buyerBreakdown: Object.values(buyerMap),
      },
    });
  }),
);

// =========================================================================
// 8. SEARCH & INSPECT FARMER LIVESTOCK HEALTH
// =========================================================================
dairyRouter.get(
  '/farmers/:query',
  asyncHandler(async (request, response) => {
    const query = decodeURIComponent(request.params.query).trim();

    // Check farmer enrollment first
    const dairyUserId = await resolveDairyUserId(request);
    const enrollment = await prisma.$queryRawUnsafe(
      'SELECT * FROM `dairy_farmer_enrollments` WHERE `dairyUserId` = ? AND (`farmerIdNumber` = ? OR `farmerIdNumber` LIKE ? OR `farmerName` LIKE ?) LIMIT 1',
      dairyUserId,
      query,
      `%${query}%`,
      `%${query}%`,
    );

    let farmerProfile = await prisma.farmerProfile.findFirst({
      where: {
        OR: [
          { farmerIdNumber: query },
          { farmerIdNumber: { contains: query } },
          { id: query },
          { userId: query },
        ],
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
      },
    });

    let farm = null;
    if (farmerProfile?.farmId) {
      farm = await prisma.farm.findUnique({
        where: { id: farmerProfile.farmId },
        include: {
          animals: {
            where: { status: 'ACTIVE' },
            include: {
              species: true,
              breed: true,
              treatments: {
                where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
                include: {
                  administrations: {
                    include: { medicine: true },
                    take: 1,
                    orderBy: { administeredAt: 'desc' },
                  },
                  prescription: {
                    include: {
                      items: {
                        include: { medicine: true },
                        take: 1,
                      },
                    },
                  },
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
              },
              certificates: {
                where: { status: 'ACTIVE' },
                orderBy: { issuedAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      });
    }

    if (!farm) {
      farm = await prisma.farm.findFirst({
        where: {
          OR: [{ id: query }, { name: { contains: query } }, { createdById: query }],
        },
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              farmerProfile: true,
            },
          },
          animals: {
            where: { status: 'ACTIVE' },
            include: {
              species: true,
              breed: true,
              treatments: {
                where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
                include: {
                  administrations: {
                    include: { medicine: true },
                    take: 1,
                    orderBy: { administeredAt: 'desc' },
                  },
                  prescription: {
                    include: {
                      items: {
                        include: { medicine: true },
                        take: 1,
                      },
                    },
                  },
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
              },
              certificates: {
                where: { status: 'ACTIVE' },
                orderBy: { issuedAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      });
      if (farm && !farmerProfile) {
        farmerProfile = farm.createdBy?.farmerProfile || null;
      }
    }

    if (!farm && !farmerProfile && (!enrollment || enrollment.length === 0)) {
      throw new AppError(404, 'FARMER_NOT_FOUND', `No farmer or farm found matching ID: ${query}`);
    }

    // If only enrolled in dairy but no farm entity in DFMS yet
    if (!farm && enrollment && enrollment.length > 0) {
      const enr = enrollment[0];
      return response.json({
        data: {
          farmer: {
            id: enr.id,
            farmerIdNumber: enr.farmerIdNumber,
            fullName: enr.farmerName,
            phone: enr.phone,
            email: enr.email,
            verificationStatus: enr.status,
            cattleCount: 0,
            agreedRatePerLiter: Number(enr.agreedRatePerLiter || 42),
            expectedDailyQuantity: Number(enr.expectedDailyQuantity || 20),
            villageArea: enr.villageArea,
          },
          farm: {
            id: enr.id,
            name: enr.farmName,
            state: enr.state,
            district: enr.district,
            taluka: enr.taluka,
            villageArea: enr.villageArea,
            pincode: enr.pincode,
            status: enr.status,
          },
          summary: {
            totalAnimals: 0,
            eligibleAnimalsCount: 0,
            withholdingAnimalsCount: 0,
            underWithdrawalCount: 0,
            underTreatmentCount: 0,
            allClearForMilk: true,
            canCollectEntireHerd: true,
            recommendation:
              'Enrolled dairy farmer. No registered individual cow tags found in platform database.',
          },
          animals: [],
        },
      });
    }

    if (!farm && farmerProfile) {
      const farmerUser = farmerProfile.user;
      return response.json({
        data: {
          farmer: {
            id: farmerUser?.id || farmerProfile.userId,
            farmerIdNumber: farmerProfile.farmerIdNumber,
            fullName: farmerUser?.fullName || 'Registered Farmer',
            phone: farmerUser?.phone || null,
            email: farmerUser?.email || null,
            verificationStatus: farmerProfile.status,
            cattleCount: farmerProfile.totalCattle || 0,
          },
          farm: {
            id: farmerProfile.farmId || 'pending-farm',
            name: farmerProfile.farmName,
            state: farmerProfile.state,
            district: farmerProfile.district,
            taluka: farmerProfile.taluka,
            pincode: farmerProfile.pincode,
            status: farmerProfile.status,
          },
          summary: {
            totalAnimals: 0,
            eligibleAnimalsCount: 0,
            withholdingAnimalsCount: 0,
            underWithdrawalCount: 0,
            underTreatmentCount: 0,
            allClearForMilk: true,
            canCollectEntireHerd: true,
            recommendation: 'Farmer verified. Animals can be added for live withdrawal monitoring.',
          },
          animals: [],
        },
      });
    }

    const farmerUser = farmerProfile?.user || farm.createdBy;
    const animalsWithHealth = (farm.animals || []).map((animal) => {
      const milkStatus = calculateAnimalMilkStatus(animal);
      return {
        id: animal.id,
        tagNumber: animal.tagNumber,
        name: animal.name,
        sex: animal.sex,
        lactating: animal.lactating,
        status: animal.status,
        dateOfBirth: animal.dateOfBirth,
        species: animal.species?.canonicalName || 'Livestock',
        breed: animal.breed?.name || 'Standard',
        milkEligibility: milkStatus,
        recentTreatments: (animal.treatments || []).slice(0, 5).map((t) => {
          const { drugName, route, dose, unit } = extractTreatmentDetails(t);
          return {
            id: t.id,
            drugName,
            activeIngredient: drugName,
            route,
            dose,
            unit,
            status: t.status,
            createdAt: t.createdAt,
            completedAt: t.completedAt,
          };
        }),
        activeCertificate: animal.certificates?.[0]
          ? {
              certificateNumber: animal.certificates[0].certificateNumber,
              verificationId: animal.certificates[0].verificationId,
              issuedAt: animal.certificates[0].issuedAt,
              status: animal.certificates[0].status,
            }
          : null,
      };
    });

    const eligibleCount = animalsWithHealth.filter((a) => a.milkEligibility.isEligible).length;
    const underWithdrawalCount = animalsWithHealth.filter(
      (a) => a.milkEligibility.status === 'UNDER_WITHDRAWAL',
    ).length;
    const underTreatmentCount = animalsWithHealth.filter(
      (a) => a.milkEligibility.status === 'TREATMENT_ACTIVE',
    ).length;
    const canCollectEntireHerd =
      animalsWithHealth.length > 0 && eligibleCount === animalsWithHealth.length;

    let recommendation =
      'All animals are clear for milk collection. No active withdrawal periods detected.';
    if (underWithdrawalCount > 0 || underTreatmentCount > 0) {
      recommendation = `WARNING: ${underWithdrawalCount + underTreatmentCount} animal(s) are currently under veterinary withdrawal or active treatment. Milk from withholding animals must NOT be commingled.`;
    }

    response.json({
      data: {
        farmer: {
          id: farmerUser?.id || farm.createdById,
          farmerIdNumber: farmerProfile?.farmerIdNumber || `FRM-${farm.id.slice(-6).toUpperCase()}`,
          fullName: farmerUser?.fullName || 'Registered Farmer',
          phone: farmerUser?.phone || null,
          email: farmerUser?.email || null,
          verificationStatus: farmerProfile?.status || 'VERIFIED',
          cattleCount: farmerProfile?.totalCattle || farm.animals.length,
        },
        farm: {
          id: farm.id,
          name: farm.name,
          state: farm.state,
          district: farm.district,
          taluka: farm.taluka,
          pincode: farm.pincode,
          status: farm.status,
        },
        summary: {
          totalAnimals: animalsWithHealth.length,
          eligibleAnimalsCount: eligibleCount,
          eligibleForCollectionCount: eligibleCount,
          withholdingAnimalsCount: underWithdrawalCount + underTreatmentCount,
          underWithdrawalCount,
          underTreatmentCount,
          allClearForMilk: canCollectEntireHerd,
          canCollectEntireHerd,
          recommendation,
        },
        animals: animalsWithHealth,
      },
    });
  }),
);

// =========================================================================
// 9. AUDIT ANIMAL TIMELINE
// =========================================================================
dairyRouter.get(
  '/animals/:animalId/timeline',
  asyncHandler(async (request, response) => {
    const { animalId } = request.params;

    const animal = await prisma.animal.findUnique({
      where: { id: animalId },
      include: {
        species: true,
        breed: true,
        farm: { select: { id: true, name: true, district: true, state: true } },
        profileEvents: { orderBy: { createdAt: 'desc' } },
        treatments: {
          include: {
            administrations: {
              include: {
                medicine: true,
                administeredBy: { select: { fullName: true } },
              },
              orderBy: { administeredAt: 'desc' },
            },
            prescription: {
              include: {
                items: {
                  include: { medicine: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        diagnoses: {
          include: {
            veterinarian: {
              include: { user: { select: { fullName: true } } },
            },
            disease: true,
          },
          orderBy: { diagnosedAt: 'desc' },
        },
        prescriptions: {
          include: {
            veterinarian: {
              include: { user: { select: { fullName: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        certificates: { orderBy: { issuedAt: 'desc' } },
      },
    });

    if (!animal) throw new AppError(404, 'ANIMAL_NOT_FOUND', 'Animal not found');

    const timelineEvents = [];

    for (const d of animal.diagnoses || []) {
      timelineEvents.push({
        id: `diag-${d.id}`,
        eventType: 'DIAGNOSIS',
        summary: `Diagnosed with ${d.disease?.name || d.clinicalNotes || 'Illness'} by Dr. ${d.veterinarian?.user?.fullName || 'Veterinarian'}`,
        details: { notes: d.clinicalNotes, date: d.diagnosedAt },
        createdAt: d.diagnosedAt,
      });
    }

    for (const p of animal.prescriptions || []) {
      timelineEvents.push({
        id: `rx-${p.id}`,
        eventType: 'PRESCRIPTION',
        summary: `Prescription issued by Dr. ${p.veterinarian?.user?.fullName || 'Veterinarian'} (${p.instructions || 'Standard course'})`,
        details: { instructions: p.instructions },
        createdAt: p.createdAt,
      });
    }

    for (const t of animal.treatments || []) {
      const { drugName, route, dose, unit } = extractTreatmentDetails(t);
      timelineEvents.push({
        id: `tx-${t.id}`,
        eventType: 'TREATMENT',
        summary: `Treatment: ${drugName} (${t.status}) — Route: ${route}, Dose: ${dose || 'Standard'} ${unit || ''}`,
        details: {
          drug: drugName,
          status: t.status,
          completionNotes: t.completionNotes,
        },
        createdAt: t.createdAt,
      });

      for (const adm of t.administrations || []) {
        const admDrug = adm.medicine?.medicineName || adm.medicineName || drugName;
        timelineEvents.push({
          id: `adm-${adm.id}`,
          eventType: 'ADMINISTRATION',
          summary: `Administered ${adm.amount} ${adm.amountUnit} of ${admDrug} by ${adm.administeredBy?.fullName || 'Technician'}`,
          details: { amount: adm.amount, unit: adm.amountUnit, notes: adm.notes },
          createdAt: adm.administeredAt,
        });
      }
    }

    for (const c of animal.certificates || []) {
      timelineEvents.push({
        id: `cert-${c.id}`,
        eventType: 'CERTIFICATE',
        summary: `Milk Eligibility Certificate Issued #${c.certificateNumber} (${c.status})`,
        details: { verificationId: c.verificationId, status: c.status },
        createdAt: c.issuedAt,
      });
    }

    for (const pe of animal.profileEvents || []) {
      timelineEvents.push({
        id: `event-${pe.id}`,
        eventType: pe.eventType,
        summary: pe.summary,
        details: pe.details,
        createdAt: pe.createdAt,
      });
    }

    timelineEvents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    response.json({
      data: {
        animal: {
          id: animal.id,
          tagNumber: animal.tagNumber,
          name: animal.name,
          species: animal.species?.canonicalName,
          breed: animal.breed?.name,
          farm: animal.farm,
        },
        events: timelineEvents,
      },
    });
  }),
);
