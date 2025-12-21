import { PrismaClient } from '@prisma/client';

/**
 * scripts/calc_payouts.ts
 *
 * Lightweight script to calculate doctor payouts for the previous month.
 * - Groups completed appointments by doctor
 * - Uses a per-consultation rate from SystemConfig or a default
 * - Creates DoctorPayout and DoctorPayoutItem records
 *
 * Run locally: `npx ts-node scripts/calc_payouts.ts`
 * Or schedule with your job runner (cron, GitHub Actions, serverless scheduler)
 */

const prisma = new PrismaClient();

async function getPerConsultationRate() {
  const cfg = await prisma.systemConfig.findUnique({ where: { key: 'PAYOUT_RATE_PER_CONSULTATION' } });
  if (cfg && cfg.value) return parseFloat(cfg.value);
  return 500; // default in KES
}

function startOfPreviousMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfPreviousMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 0); // last day of previous month
  d.setHours(23, 59, 59, 999);
  return d;
}

async function main() {
  const now = new Date();
  const periodStart = startOfPreviousMonth(now);
  const periodEnd = endOfPreviousMonth(now);
  console.log(`Calculating payouts for period: ${periodStart.toISOString()} -> ${periodEnd.toISOString()}`);

  const rate = await getPerConsultationRate();
  console.log(`Using per-consultation rate: ${rate}`);

  // Fetch completed appointments in the period with a doctor assigned
  const appointments = await prisma.appointment.findMany({
    where: {
      status: 'COMPLETED',
      doctorId: { not: null },
      updatedAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    select: {
      id: true,
      doctorId: true,
      patientId: true,
      notes: true,
      updatedAt: true,
      scheduledAt: true,
    },
  });

  if (appointments.length === 0) {
    console.log('No completed appointments found for period.');
    return;
  }

  // Group by doctor
  const byDoctor: Record<string, typeof appointments> = {} as any;
  for (const a of appointments) {
    if (!a.doctorId) continue;
    byDoctor[a.doctorId] = byDoctor[a.doctorId] || [];
    byDoctor[a.doctorId].push(a);
  }

  for (const doctorId of Object.keys(byDoctor)) {
    const items = byDoctor[doctorId];
    const consultationsCount = items.length;
    const amountDue = consultationsCount * rate;

    // Create DoctorPayout record
    const payout = await prisma.doctorPayout.create({
      data: {
        doctorId,
        periodStart,
        periodEnd,
        consultationsCount,
        interactionsCount: consultationsCount, // placeholder: same as consultations
        amountDue,
        currency: 'KES',
        status: 'READY',
        notes: `Auto-generated for ${consultationsCount} consultations at rate ${rate}`,
        items: {
          create: items.map((it) => ({
            appointmentId: it.id,
            description: `Consultation ${it.id}`,
            amount: rate,
            currency: 'KES',
          })),
        },
      },
    });

    console.log(`Created payout ${payout.id} for doctor ${doctorId}: ${consultationsCount} x ${rate} = ${amountDue}`);
  }

  console.log('Done.');
}
export async function calculatePayoutsForPeriod(periodStart: Date, periodEnd: Date) {
  const rate = await getPerConsultationRate();
  console.log(`Using per-consultation rate: ${rate}`);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: 'COMPLETED',
      doctorId: { not: null },
      updatedAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    select: {
      id: true,
      doctorId: true,
      patientId: true,
      notes: true,
      updatedAt: true,
      scheduledAt: true,
    },
  });

  if (appointments.length === 0) {
    console.log('No completed appointments found for period.');
    return 0;
  }

  // Group by doctor
  const byDoctor: Record<string, typeof appointments> = {} as any;
  for (const a of appointments) {
    if (!a.doctorId) continue;
    byDoctor[a.doctorId] = byDoctor[a.doctorId] || [];
    byDoctor[a.doctorId].push(a);
  }

  let created = 0;
  for (const doctorId of Object.keys(byDoctor)) {
    const items = byDoctor[doctorId];
    const consultationsCount = items.length;
    const amountDue = consultationsCount * rate;

    // Create DoctorPayout record
    const payout = await prisma.doctorPayout.create({
      data: {
        doctorId,
        periodStart,
        periodEnd,
        consultationsCount,
        interactionsCount: consultationsCount, // placeholder: same as consultations
        amountDue,
        currency: 'KES',
        status: 'READY',
        notes: `Auto-generated for ${consultationsCount} consultations at rate ${rate}`,
        items: {
          create: items.map((it) => ({
            appointmentId: it.id,
            description: `Consultation ${it.id}`,
            amount: rate,
            currency: 'KES',
          })),
        },
      },
    });

    console.log(`Created payout ${payout.id} for doctor ${doctorId}: ${consultationsCount} x ${rate} = ${amountDue}`);
    created++;
  }

  return created;
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
