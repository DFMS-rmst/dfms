import { Router } from 'express';
import { authenticate } from '../../common/auth.js';
import { AppError, asyncHandler } from '../../common/errors.js';
import { prisma } from '../../infrastructure/prisma/client.js';

export const dairyRouter = Router();
dairyRouter.use(authenticate);

function extractTreatmentDetails(treatment) {
  const adminItem = treatment.administrations?.[0];
  const rxItem = treatment.prescription?.items?.[0];
  const drugName =
    adminItem?.drug?.canonicalName ||
    rxItem?.drug?.canonicalName ||
    adminItem?.drug?.name ||
    rxItem?.drug?.name ||
    'Veterinary Medication';
  const route = adminItem?.route || rxItem?.route || 'Intramuscular';
  const dose = adminItem?.amount ? Number(adminItem.amount) : rxItem?.doseValue ? Number(rxItem.doseValue) : null;
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
    .sort((a, b) => new Date(b.completedAt || b.updatedAt) - new Date(a.completedAt || a.updatedAt));

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

// List all registered farmers for dairy operator lookup
dairyRouter.get(
  '/farmers',
  asyncHandler(async (request, response) => {
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
                  include: { drug: { select: { canonicalName: true, name: true } } },
                  take: 1,
                  orderBy: { administeredAt: 'desc' },
                },
                prescription: {
                  include: {
                    items: {
                      include: { drug: { select: { canonicalName: true, name: true } } },
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

    const farmers = farms.map((f) => {
      const animalStatuses = f.animals.map(calculateAnimalMilkStatus);
      const eligibleCount = animalStatuses.filter((s) => s.isEligible).length;
      const underWithdrawalCount = animalStatuses.filter((s) => s.status === 'UNDER_WITHDRAWAL').length;
      const underTreatmentCount = animalStatuses.filter((s) => s.status === 'TREATMENT_ACTIVE').length;

      return {
        farmId: f.id,
        farmName: f.name,
        state: f.state,
        district: f.district,
        taluka: f.taluka,
        pincode: f.pincode,
        farmStatus: f.status,
        farmerIdNumber:
          f.createdBy?.farmerProfile?.farmerIdNumber || `FRM-${f.id.slice(-6).toUpperCase()}`,
        farmerName: f.createdBy?.fullName || 'Registered Farmer',
        farmerPhone: f.createdBy?.phone || null,
        farmerEmail: f.createdBy?.email || null,
        totalAnimals: f.animals.length,
        eligibleAnimalsCount: eligibleCount,
        withholdingAnimalsCount: underWithdrawalCount + underTreatmentCount,
        allClearForMilk: f.animals.length > 0 && eligibleCount === f.animals.length,
      };
    });

    response.json({ data: { farmers } });
  }),
);

// Search and get farmer by Farmer ID, Farm ID, or Name with animals & health info
dairyRouter.get(
  '/farmers/:query',
  asyncHandler(async (request, response) => {
    const query = decodeURIComponent(request.params.query).trim();

    // Try finding by farmerIdNumber
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
                    include: { drug: true },
                    take: 1,
                    orderBy: { administeredAt: 'desc' },
                  },
                  prescription: {
                    include: {
                      items: {
                        include: { drug: true },
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
      // Search by farm ID or farm name
      farm = await prisma.farm.findFirst({
        where: {
          OR: [
            { id: query },
            { name: { contains: query } },
            { createdById: query },
          ],
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
                    include: { drug: true },
                    take: 1,
                    orderBy: { administeredAt: 'desc' },
                  },
                  prescription: {
                    include: {
                      items: {
                        include: { drug: true },
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

    if (!farm && !farmerProfile) {
      throw new AppError(404, 'FARMER_NOT_FOUND', `No farmer or farm found matching ID: ${query}`);
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

    response.json({
      data: {
        farmer: {
          id: farmerUser?.id || farm.createdById,
          farmerIdNumber:
            farmerProfile?.farmerIdNumber || `FRM-${farm.id.slice(-6).toUpperCase()}`,
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
          withholdingAnimalsCount: underWithdrawalCount + underTreatmentCount,
          underWithdrawalCount,
          underTreatmentCount,
          allClearForMilk:
            animalsWithHealth.length > 0 && eligibleCount === animalsWithHealth.length,
        },
        animals: animalsWithHealth,
      },
    });
  }),
);

// Animal health timeline for dairy operator audit inspection
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
                drug: true,
                administeredBy: { select: { fullName: true } },
              },
              orderBy: { administeredAt: 'desc' },
            },
            prescription: {
              include: {
                items: {
                  include: { drug: true },
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
        const admDrug = adm.drug?.canonicalName || adm.drug?.name || drugName;
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
