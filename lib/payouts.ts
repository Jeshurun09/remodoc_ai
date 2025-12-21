import { PrismaClient, DoctorPayout, PayoutProvider, PayoutStatus } from '@prisma/client';
import Stripe from 'stripe';

const stripeSecret = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
// Use a Stripe API version compatible with installed types
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: '2023-10-16' }) : null;

const prisma = new PrismaClient();

/**
 * Provider runner: routes payout to provider-specific implementation.
 * For now these are lightweight placeholders that either simulate success
 * or return an actionable error if doctor/provider configuration is missing.
 */

export async function triggerPayout(payoutId: string) {
  const payout = await prisma.doctorPayout.findUnique({
    where: { id: payoutId },
    include: { doctor: { include: { user: true } }, items: true },
  });
  if (!payout) throw new Error('Payout not found');

  // Choose provider if not set
  let provider = payout.provider as PayoutProvider | null;
  if (!provider) {
    // Default mapping: KES -> MPESA_B2C, otherwise STRIPE_CONNECT
    provider = payout.currency === 'KES' ? PayoutProvider.MPESA_B2C : PayoutProvider.STRIPE_CONNECT;
  }

  // Update status to PROCESSING
  await prisma.doctorPayout.update({ where: { id: payoutId }, data: { status: PayoutStatus.PROCESSING } });

  try {
    let result: { success: boolean; providerReference?: string; message?: string } = { success: false };
    switch (provider) {
      case PayoutProvider.STRIPE_CONNECT:
        result = await runStripeConnectPayout(payout);
        break;
      case PayoutProvider.PAYPAL_PAYOUTS:
        result = await runPayPalPayout(payout);
        break;
      case PayoutProvider.MPESA_B2C:
        result = await runMpesaB2CPayout(payout);
        break;
      case PayoutProvider.BANK_TRANSFER:
        result = await runBankTransferPayout(payout);
        break;
      default:
        result = { success: false, message: 'Unsupported provider' };
    }

    if (result.success) {
      await prisma.doctorPayout.update({
        where: { id: payoutId },
        data: {
          status: PayoutStatus.PAID,
          providerReference: result.providerReference,
          processedAt: new Date(),
        },
      });
      return { success: true, providerReference: result.providerReference };
    } else {
      await prisma.doctorPayout.update({ where: { id: payoutId }, data: { status: PayoutStatus.FAILED } });
      return { success: false, message: result.message };
    }
  } catch (err: any) {
    await prisma.doctorPayout.update({ where: { id: payoutId }, data: { status: PayoutStatus.FAILED } });
    return { success: false, message: err.message || 'Unknown error' };
  }
}

async function runStripeConnectPayout(payout: DoctorPayout) {
  // Placeholder: verify doctor has stripeAccountId
  const doctor = await prisma.doctorProfile.findUnique({ where: { id: payout.doctorId }, include: { user: true } });
  if (!doctor) return { success: false, message: 'Doctor not found' };
  if (!doctor.stripeAccountId) return { success: false, message: 'Doctor has no Stripe Connect account configured' };
  // If we don't have Stripe configured, simulate for now
  if (!stripe) {
    const providerReference = `stripe_payout_sim_${payout.id}`;
    return { success: true, providerReference };
  }

  // Convert amount to smallest currency unit (cents)
  const amountCents = Math.round((payout.amountDue || 0) * 100);
  if (amountCents <= 0) return { success: false, message: 'Invalid payout amount' };

  try {
    // Create a Transfer from platform to connected account
    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency: (payout.currency || 'KES').toLowerCase(),
      destination: doctor.stripeAccountId,
      description: `Doctor payout ${payout.id} for period ${payout.periodStart.toISOString()} - ${payout.periodEnd.toISOString()}`,
    });

    const providerReference = transfer.id;
    return { success: true, providerReference };
  } catch (err: any) {
    return { success: false, message: err.message || 'Stripe transfer failed' };
  }
}

async function runPayPalPayout(payout: DoctorPayout) {
  const doctor = await prisma.doctorProfile.findUnique({ where: { id: payout.doctorId }, include: { user: true } });
  if (!doctor) return { success: false, message: 'Doctor not found' };
  if (!doctor.paypalPayoutEmail) return { success: false, message: 'Doctor has no PayPal payout email configured' };

  // If no PayPal credentials, simulate
  const payPalClientId = process.env.PAYPAL_CLIENT_ID;
  const payPalClientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!payPalClientId || !payPalClientSecret) {
    const providerReference = `paypal_payout_sim_${payout.id}`;
    return { success: true, providerReference };
  }

  // Real PayPal Payouts call
  try {
    const tokenModule = await import('./paypal');
    const token = await tokenModule.getPayPalToken();
    const PAYPAL_BASE_URL = process.env.PAYPAL_ENV === 'production' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';

    const axios = (await import('axios')).default;

    const batch = {
      sender_batch_header: {
        sender_batch_id: `batch_${payout.id}_${Date.now()}`,
        email_subject: 'RemoDoc doctor payout',
        email_message: `You have received a payout for ${payout.periodStart.toISOString().slice(0,10)} - ${payout.periodEnd.toISOString().slice(0,10)}`
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: (payout.amountDue || 0).toFixed(2),
            currency: payout.currency || 'USD'
          },
          receiver: doctor.paypalPayoutEmail,
          note: `Payout for period ${payout.periodStart.toISOString().slice(0,10)} - ${payout.periodEnd.toISOString().slice(0,10)}`,
          sender_item_id: payout.id
        }
      ]
    };

    const resp = await axios.post(`${PAYPAL_BASE_URL}/v1/payments/payouts`, batch, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
    const providerReference = resp.data.batch_header && resp.data.batch_header.payout_batch_id ? resp.data.batch_header.payout_batch_id : `paypal_payout_${payout.id}`;
    return { success: true, providerReference };
  } catch (err: any) {
    return { success: false, message: err.message || 'PayPal payout failed' };
  }
}

async function runMpesaB2CPayout(payout: DoctorPayout) {
  const doctor = await prisma.doctorProfile.findUnique({ where: { id: payout.doctorId }, include: { user: true } });
  if (!doctor) return { success: false, message: 'Doctor not found' };
  if (!doctor.mpesaPhoneNumber) return { success: false, message: 'Doctor has no M-Pesa phone number configured' };
  // If platform has explicit B2C security credential settings, attempt real call, otherwise simulate
  const hasMpesaB2C = !!(process.env.MPESA_B2C_SECURITY_CREDENTIAL && process.env.MPESA_INITIATOR_NAME && (process.env.MPESA_B2C_PARTYB || process.env.MPESA_SHORTCODE));
  if (!hasMpesaB2C) {
    const providerReference = `mpesa_b2c_sim_${payout.id}`;
    return { success: true, providerReference };
  }

  try {
    const mpesa = await import('./mpesa');
    const resp = await mpesa.initiateB2CPayment(doctor.mpesaPhoneNumber!, payout.amountDue || 0, `Payout ${payout.id}`);
    const providerReference = resp.ConversationID || resp.ResponseDescription || resp.ResponseMessage || `mpesa_b2c_${payout.id}`;
    return { success: true, providerReference };
  } catch (err: any) {
    return { success: false, message: err.message || 'M-Pesa B2C call failed' };
  }
}

async function runBankTransferPayout(payout: DoctorPayout) {
  const doctor = await prisma.doctorProfile.findUnique({ where: { id: payout.doctorId }, include: { user: true } });
  if (!doctor) return { success: false, message: 'Doctor not found' };
  if (!doctor.bankDetails) return { success: false, message: 'Doctor has no bank details configured' };
  const bankApiUrl = process.env.BANK_API_URL;
  const bankApiKey = process.env.BANK_API_KEY;
  if (!bankApiUrl || !bankApiKey) {
    // Simulate success when no bank API configured
    const providerReference = `bank_transfer_sim_${payout.id}`;
    return { success: true, providerReference };
  }

  try {
    const axios = (await import('axios')).default;
    const details = JSON.parse(doctor.bankDetails || '{}');
    const resp = await axios.post(`${bankApiUrl}/payouts`, { amount: payout.amountDue, currency: payout.currency, beneficiary: details }, { headers: { Authorization: `Bearer ${bankApiKey}` } });
    const providerReference = resp.data && (resp.data.id || resp.data.reference) ? (resp.data.id || resp.data.reference) : `bank_transfer_${payout.id}`;
    return { success: true, providerReference };
  } catch (err: any) {
    return { success: false, message: err.message || 'Bank transfer failed' };
  }
}

export async function markPayoutAsApproved(payoutId: string, adminId?: string) {
  return prisma.doctorPayout.update({ where: { id: payoutId }, data: { status: PayoutStatus.APPROVED, approvedByAdminId: adminId } });
}

export async function getPayoutById(payoutId: string) {
  return prisma.doctorPayout.findUnique({ where: { id: payoutId }, include: { doctor: { include: { user: true } }, items: true } });
}

export async function listPayouts(filter?: any) {
  return prisma.doctorPayout.findMany({ include: { doctor: { include: { user: true } }, items: true }, orderBy: { periodStart: 'desc' } });
}
