import crypto from 'node:crypto';
import { Router } from 'express';
import { authenticate } from '../../common/auth.js';
import { AppError, asyncHandler } from '../../common/errors.js';
import { prisma } from '../../infrastructure/prisma/client.js';

// =========================================================================
// PHASE 1: ENROLLMENTS (ONE-TIME ASSOCIATION)
// =========================================================================
export const enrollmentsRouter = Router();
enrollmentsRouter.use(authenticate);

/**
 * POST /api/enrollments
 * Allows a farmer to send a join request to a dairy.
 * Inserts a record into dairy_farmer_enrollments with status = 'PENDING_APPROVAL'.
 */
enrollmentsRouter.post(
  '/',
  asyncHandler(async (request, response) => {
    const user = request.user;
    const body = request.body || {};

    if (!body.dairyUserId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Target dairy (dairyUserId) is required.');
    }

    // Resolve farmer profile & farm if user is authenticated
    let farmerProfile = null;
    let farmerFarm = null;
    if (user?.id) {
      farmerProfile = await prisma.farmerProfile.findFirst({
        where: { userId: user.id },
      });
      farmerFarm = await prisma.farm.findFirst({
        where: { createdById: user.id, status: 'ACTIVE' },
      });
    }

    const id = `dfe_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const dairyUserId = String(body.dairyUserId).trim();
    const farmerUserId = user?.id || body.farmerUserId || null;
    const farmerIdNumber = String(
      body.farmerIdNumber ||
        farmerProfile?.farmerIdNumber ||
        `FMR-${user?.id ? user.id.slice(-6).toUpperCase() : crypto.randomUUID().slice(0, 6).toUpperCase()}`,
    ).trim();
    const farmerName = String(
      body.farmerName || user?.fullName || farmerProfile?.farmerName || 'Registered Farmer',
    ).trim();
    const farmName = String(
      body.farmName || farmerFarm?.name || farmerProfile?.farmName || `${farmerName}'s Farm`,
    ).trim();
    const phone = body.phone ? String(body.phone).trim() : user?.phone || null;
    const email = body.email ? String(body.email).trim() : user?.email || null;
    const state = body.state
      ? String(body.state).trim()
      : farmerFarm?.state || farmerProfile?.state || 'Maharashtra';
    const district = body.district
      ? String(body.district).trim()
      : farmerFarm?.district || farmerProfile?.district || 'Kolhapur';
    const taluka = body.taluka ? String(body.taluka).trim() : farmerFarm?.taluka || null;
    const villageArea = body.villageArea
      ? String(body.villageArea).trim()
      : farmerFarm?.name
        ? `${farmerFarm.name} Route`
        : `${district} Center`;
    const pincode = body.pincode ? String(body.pincode).trim() : farmerFarm?.pincode || null;
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
    const joinRequestNotes =
      body.joinRequestNotes || body.notes || 'Enrollment join request for fast daily collection.';
    const certificateNumber = body.certificateNumber ? String(body.certificateNumber).trim() : null;
    const certificateVerificationId = body.certificateVerificationId
      ? String(body.certificateVerificationId).trim()
      : null;

    // Check if an enrollment record already exists
    const existing = await prisma.$queryRawUnsafe(
      'SELECT id, status FROM `dairy_farmer_enrollments` WHERE `dairyUserId` = ? AND (`farmerUserId` = ? OR `farmerIdNumber` = ?) LIMIT 1',
      dairyUserId,
      farmerUserId,
      farmerIdNumber,
    );

    if (existing && existing.length > 0) {
      const enr = existing[0];
      if (enr.status === 'ACTIVE') {
        return response.status(200).json({
          data: {
            enrollmentId: enr.id,
            status: 'ACTIVE',
            message: 'You are already an active enrolled supplier with this dairy.',
          },
        });
      }

      // Update and reactivate to PENDING_APPROVAL
      await prisma.$executeRawUnsafe(
        `UPDATE \`dairy_farmer_enrollments\` SET
          \`farmerName\` = ?, \`farmName\` = ?, \`phone\` = ?, \`email\` = ?, \`state\` = ?,
          \`district\` = ?, \`taluka\` = ?, \`villageArea\` = ?, \`milkType\` = ?,
          \`expectedDailyQuantity\` = ?, \`agreedRatePerLiter\` = ?, \`baseFatPercentage\` = ?,
          \`baseSnfPercentage\` = ?, \`status\` = 'PENDING_APPROVAL', \`joinRequestNotes\` = ?,
          \`certificateNumber\` = ?, \`certificateVerificationId\` = ?, \`updatedAt\` = NOW()
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
        joinRequestNotes,
        certificateNumber,
        certificateVerificationId,
        enr.id,
      );

      return response.status(200).json({
        data: {
          enrollmentId: enr.id,
          status: 'PENDING_APPROVAL',
          message: 'Join request re-submitted for approval.',
        },
      });
    }

    // Insert new record with status = 'PENDING_APPROVAL'
    await prisma.$executeRawUnsafe(
      `INSERT INTO \`dairy_farmer_enrollments\` (
        \`id\`, \`dairyUserId\`, \`farmerUserId\`, \`farmerIdNumber\`, \`farmerName\`, \`farmName\`,
        \`phone\`, \`email\`, \`state\`, \`district\`, \`taluka\`, \`villageArea\`, \`pincode\`,
        \`milkType\`, \`expectedDailyQuantity\`, \`agreedRatePerLiter\`, \`baseFatPercentage\`,
        \`baseSnfPercentage\`, \`paymentMethod\`, \`bankAccountNumber\`, \`bankIfsc\`, \`bankName\`,
        \`upiId\`, \`status\`, \`joinRequestNotes\`, \`certificateNumber\`, \`certificateVerificationId\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', ?, ?, ?)`,
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
      joinRequestNotes,
      certificateNumber,
      certificateVerificationId,
    );

    // Notify dairy owner
    try {
      await prisma.alert.create({
        data: {
          userId: dairyUserId,
          type: 'ENROLLMENT_REQUEST',
          title: 'New Farmer Join Request 🧑‍🌾',
          message: `${farmerName} (${farmName}) sent an enrollment join request to supply ${expectedDailyQuantity}L/day at ₹${agreedRatePerLiter}/L.`,
          entityType: 'DAIRY_ENROLLMENT',
          entityId: id,
        },
      });
    } catch {
      // ignore alert error
    }

    response.status(201).json({
      data: {
        enrollmentId: id,
        status: 'PENDING_APPROVAL',
        message: 'Join request submitted successfully. Awaiting dairy approval.',
      },
    });
  }),
);

/**
 * GET /api/enrollments
 * Query dairy_farmer_enrollments with filters (status, dairyUserId, search, area)
 */
enrollmentsRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const { status, dairyUserId, search, area } = request.query;
    let query = 'SELECT * FROM `dairy_farmer_enrollments` WHERE 1=1';
    const params = [];

    if (dairyUserId) {
      query += ' AND `dairyUserId` = ?';
      params.push(dairyUserId);
    }

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

/**
 * PUT /api/enrollments/{id}/status
 * Allows dairy owner to accept/reject request. Updates status to 'ACTIVE' or 'REJECTED'.
 */
enrollmentsRouter.put(
  '/:id/status',
  asyncHandler(async (request, response) => {
    const { id } = request.params;
    const body = request.body || {};

    if (
      !body.status ||
      !['ACTIVE', 'REJECTED', 'PENDING_APPROVAL', 'SUSPENDED'].includes(body.status)
    ) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Valid status (ACTIVE or REJECTED) is required.');
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

// General enrollment update PUT /api/enrollments/{id}
enrollmentsRouter.put(
  '/:id',
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
    const status = body.status !== undefined ? body.status : current.status;
    const agreedRate =
      body.agreedRatePerLiter !== undefined
        ? parseFloat(body.agreedRatePerLiter)
        : Number(current.agreedRatePerLiter);
    const notes =
      body.joinRequestNotes !== undefined ? body.joinRequestNotes : current.joinRequestNotes;

    await prisma.$executeRawUnsafe(
      'UPDATE `dairy_farmer_enrollments` SET `status` = ?, `joinRequestNotes` = ?, `agreedRatePerLiter` = ?, `updatedAt` = NOW() WHERE `id` = ?',
      status,
      notes,
      agreedRate,
      id,
    );

    response.json({
      data: {
        enrollmentId: id,
        status,
        agreedRatePerLiter: agreedRate,
        message: 'Enrollment updated successfully.',
      },
    });
  }),
);

// =========================================================================
// PHASE 2: DAILY QR VALIDATION & INTAKE (THE FAST FLOW)
// =========================================================================
export const milkCollectionRouter = Router();
milkCollectionRouter.use(authenticate);

/**
 * GET /api/milk-collection/validate-farmer?dairyUserId={id}&farmerIdNumber={id}
 * Query dairy_farmer_enrollments to verify the relationship.
 * If status is 'ACTIVE', return DTO with enrollmentId, farmerName, expectedDailyQuantity, agreedRatePerLiter, baseFatPercentage, baseSnfPercentage.
 * If status is not 'ACTIVE' (or doesn't exist), return a 403 or 404 error.
 */
milkCollectionRouter.get(
  '/validate-farmer',
  asyncHandler(async (request, response) => {
    const { dairyUserId, farmerIdNumber } = request.query;

    if (!dairyUserId || !farmerIdNumber) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Both dairyUserId and farmerIdNumber query parameters are required.',
      );
    }

    const trimmedFarmerId = String(farmerIdNumber).trim();
    const trimmedDairyId = String(dairyUserId).trim();

    // Query dairy_farmer_enrollments to verify relationship
    const rows = await prisma.$queryRawUnsafe(
      'SELECT * FROM `dairy_farmer_enrollments` WHERE `dairyUserId` = ? AND (`farmerIdNumber` = ? OR `farmerUserId` = ?) ORDER BY `createdAt` DESC LIMIT 1',
      trimmedDairyId,
      trimmedFarmerId,
      trimmedFarmerId,
    );

    if (!rows || rows.length === 0) {
      throw new AppError(
        404,
        'NOT_FOUND',
        `No enrollment record found for farmer "${trimmedFarmerId}" at this dairy. Phase 1 enrollment is required before milk intake.`,
      );
    }

    const enr = rows[0];

    // Check if status is 'ACTIVE'
    if (enr.status !== 'ACTIVE') {
      throw new AppError(
        403,
        'ENROLLMENT_NOT_ACTIVE',
        `Farmer "${enr.farmerName}" (${enr.farmerIdNumber}) enrollment status is "${enr.status}". Milk collection is only allowed for ACTIVE farmers.`,
      );
    }

    // Return the required DTO
    response.json({
      data: {
        enrollmentId: enr.id,
        farmerName: enr.farmerName,
        farmerIdNumber: enr.farmerIdNumber,
        farmName: enr.farmName,
        villageArea: enr.villageArea,
        milkType: enr.milkType || 'COW',
        expectedDailyQuantity: Number(enr.expectedDailyQuantity || 0),
        agreedRatePerLiter: Number(enr.agreedRatePerLiter || 0),
        baseFatPercentage: Number(enr.baseFatPercentage || 0),
        baseSnfPercentage: Number(enr.baseSnfPercentage || 0),
      },
    });
  }),
);

/**
 * POST /api/milk-collection/intake
 * Payload: dairyUserId, enrollmentId, farmerIdNumber, farmerName, collectionDate, shift, milkType, quantityLiters, fatPercentage, snfPercentage.
 * Logic: Fetch base agreedRatePerLiter from enrollment record. Set ratePerLiter = agreedRatePerLiter.
 * Calculate totalCost = (quantityLiters * ratePerLiter).
 * Insert into dairy_milk_intakes with default values for storageTank ('Silo-1'), eligibilityStatus ('CLEARED'),
 * paymentStatus ('PENDING'), and qualityGrade ('GRADE_A').
 */
milkCollectionRouter.post(
  '/intake',
  asyncHandler(async (request, response) => {
    const body = request.body || {};
    const {
      dairyUserId,
      enrollmentId,
      farmerIdNumber,
      farmerName,
      collectionDate,
      shift,
      milkType,
      quantityLiters,
      fatPercentage,
      snfPercentage,
    } = body;

    if (
      !dairyUserId ||
      !farmerIdNumber ||
      quantityLiters === undefined ||
      quantityLiters === null ||
      quantityLiters === ''
    ) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'dairyUserId, farmerIdNumber, and quantityLiters are required.',
      );
    }

    const qty = parseFloat(quantityLiters);
    if (isNaN(qty) || qty <= 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'quantityLiters must be a positive number.');
    }

    // Fetch base agreedRatePerLiter from enrollment record
    let enrollment = null;
    if (enrollmentId) {
      const enrRows = await prisma.$queryRawUnsafe(
        'SELECT * FROM `dairy_farmer_enrollments` WHERE `id` = ? LIMIT 1',
        enrollmentId,
      );
      if (enrRows && enrRows.length > 0) enrollment = enrRows[0];
    }

    if (!enrollment) {
      const enrRows = await prisma.$queryRawUnsafe(
        'SELECT * FROM `dairy_farmer_enrollments` WHERE `dairyUserId` = ? AND (`farmerIdNumber` = ? OR `farmerUserId` = ?) AND `status` = "ACTIVE" ORDER BY `createdAt` DESC LIMIT 1',
        dairyUserId,
        farmerIdNumber,
        farmerIdNumber,
      );
      if (enrRows && enrRows.length > 0) enrollment = enrRows[0];
    }

    if (!enrollment) {
      throw new AppError(
        404,
        'ENROLLMENT_NOT_FOUND',
        `Active enrollment record not found for farmer "${farmerIdNumber}" at this dairy.`,
      );
    }

    const ratePerLiter = Number(enrollment.agreedRatePerLiter || 42.0);
    const totalCost = parseFloat((qty * ratePerLiter).toFixed(2));
    const effectiveFarmerName = farmerName || enrollment.farmerName || 'Supplying Farmer';
    const effectiveFarmName = enrollment.farmName || null;
    const effectiveVillageArea = enrollment.villageArea || null;
    const effectiveDate = collectionDate || new Date().toISOString().split('T')[0];
    const effectiveShift = shift === 'EVENING' ? 'EVENING' : 'MORNING';
    const effectiveMilkType = ['COW', 'BUFFALO', 'MIXED'].includes(milkType)
      ? milkType
      : enrollment.milkType || 'COW';
    const effectiveFat = parseFloat(fatPercentage) || Number(enrollment.baseFatPercentage) || 4.0;
    const effectiveSnf = parseFloat(snfPercentage) || Number(enrollment.baseSnfPercentage) || 8.5;

    const id = `intake_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    // Insert into dairy_milk_intakes with default values for storageTank ('Silo-1'),
    // eligibilityStatus ('CLEARED'), paymentStatus ('PENDING'), and qualityGrade ('GRADE_A')
    await prisma.$executeRawUnsafe(
      `INSERT INTO \`dairy_milk_intakes\` (
        \`id\`, \`dairyUserId\`, \`enrollmentId\`, \`farmerIdNumber\`, \`farmerName\`, \`farmName\`,
        \`villageArea\`, \`collectionDate\`, \`shift\`, \`milkType\`, \`quantityLiters\`,
        \`fatPercentage\`, \`snfPercentage\`, \`ratePerLiter\`, \`totalCost\`, \`storageTank\`,
        \`eligibilityStatus\`, \`paymentStatus\`, \`qualityGrade\`, \`notes\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Silo-1', 'CLEARED', 'PENDING', 'GRADE_A', ?)`,
      id,
      dairyUserId,
      enrollment.id,
      enrollment.farmerIdNumber,
      effectiveFarmerName,
      effectiveFarmName,
      effectiveVillageArea,
      effectiveDate,
      effectiveShift,
      effectiveMilkType,
      qty,
      effectiveFat,
      effectiveSnf,
      ratePerLiter,
      totalCost,
      body.notes || 'Fast POS daily milk intake collection',
    );

    // Notify farmer if user linked
    try {
      if (enrollment.farmerUserId) {
        await prisma.alert.create({
          data: {
            userId: enrollment.farmerUserId,
            type: 'MILK_INTAKE_RECORDED',
            title: 'Milk Collection Accepted 🥛',
            message: `Recorded ${qty}L (${effectiveMilkType}) on ${effectiveDate} (${effectiveShift}). Rate: ₹${ratePerLiter}/L, Payout: ₹${totalCost}.`,
            entityType: 'DAIRY_INTAKE',
            entityId: id,
          },
        });
      }
    } catch {
      // ignore alert error
    }

    response.status(201).json({
      data: {
        intakeId: id,
        enrollmentId: enrollment.id,
        farmerIdNumber: enrollment.farmerIdNumber,
        farmerName: effectiveFarmerName,
        collectionDate: effectiveDate,
        shift: effectiveShift,
        milkType: effectiveMilkType,
        quantityLiters: qty,
        fatPercentage: effectiveFat,
        snfPercentage: effectiveSnf,
        ratePerLiter,
        totalCost,
        storageTank: 'Silo-1',
        eligibilityStatus: 'CLEARED',
        paymentStatus: 'PENDING',
        qualityGrade: 'GRADE_A',
        message: 'Fast daily milk intake logged successfully.',
      },
    });
  }),
);
