import { fail, ok } from '@/lib/server/http';
import { requireSessionUser } from '@/lib/server/auth';
import { platformStore } from '@/lib/server/store';
import type { BuyerProfileDetails, FarmerProfileDetails, UserWorkspaceProfile } from '@/lib/types';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const AADHAAR_REGEX = /^\d{12}$/;

export async function GET() {
  try {
    const user = await requireSessionUser();
    const [profile, orders, invoices, shipments, notifications, interactions, transactions, loans] = await Promise.all([
      platformStore.getUserWorkspace(user.email),
      platformStore.listOrders(user.role === 'admin' ? undefined : user.email),
      platformStore.listInvoices(user.role === 'admin' ? undefined : user.email),
      platformStore.listShipments(user.role === 'admin' ? undefined : user.email),
      platformStore.listNotifications(user.role === 'admin' ? undefined : user.email),
      platformStore.listBuyerInteractions(user.role === 'admin' ? undefined : user.email),
      platformStore.listFinanceTransactions(user.role === 'admin' ? undefined : user.email),
      platformStore.listLoanApplications(user.role === 'admin' ? undefined : user.email),
    ]);

    return ok({
      profile,
      orders,
      invoices,
      shipments,
      notifications,
      interactions,
      transactions,
      loans,
    });
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = (await request.json()) as Partial<UserWorkspaceProfile>;
    const currentProfile = await platformStore.getUserWorkspace(user.email);
    if (!currentProfile) return fail('Profile not found', 404);

    const updates: Partial<UserWorkspaceProfile> = {
      displayName: body.displayName?.trim() ?? currentProfile.displayName,
      phone: body.phone?.trim() ?? currentProfile.phone,
      city: body.city?.trim() ?? currentProfile.city,
      state: body.state?.trim() ?? currentProfile.state,
      address: body.address?.trim() ?? currentProfile.address,
      about: body.about?.trim() ?? currentProfile.about,
      preferredLanguage: body.preferredLanguage ?? currentProfile.preferredLanguage,
      notificationPreferences: {
        ...currentProfile.notificationPreferences,
        ...(body.notificationPreferences ?? {}),
      },
    };

    if (user.role === 'user') {
      const aadhaar = body.farmerProfile?.aadhaarNumber?.trim();
      if (aadhaar && !AADHAAR_REGEX.test(aadhaar)) {
        return fail('Aadhaar number must contain exactly 12 digits.', 400);
      }
      const nextFarmerProfile: FarmerProfileDetails = {
        aadhaarNumber: aadhaar ?? currentProfile.farmerProfile?.aadhaarNumber ?? '',
        farmSizeAcres: body.farmerProfile?.farmSizeAcres ?? currentProfile.farmerProfile?.farmSizeAcres ?? 0,
        primaryCrops: body.farmerProfile?.primaryCrops ?? currentProfile.farmerProfile?.primaryCrops ?? [],
        mandiPreference: body.farmerProfile?.mandiPreference ?? currentProfile.farmerProfile?.mandiPreference ?? '',
      };
      updates.farmerProfile = nextFarmerProfile;
      if (aadhaar && aadhaar !== currentProfile.farmerProfile?.aadhaarNumber) {
        updates.verification = {
          ...currentProfile.verification,
          farmer: {
            status: 'pending',
            label: 'Aadhaar submitted and awaiting admin review',
            submittedAt: new Date().toISOString(),
          },
        };
      }
    }

    if (user.role === 'buyer') {
      const gstin = body.buyerProfile?.gstin?.trim().toUpperCase();
      if (gstin && !GSTIN_REGEX.test(gstin)) {
        return fail('GSTIN format is invalid.', 400);
      }
      const nextBuyerProfile: BuyerProfileDetails = {
        gstin: gstin ?? currentProfile.buyerProfile?.gstin ?? '',
        businessName: body.buyerProfile?.businessName ?? currentProfile.buyerProfile?.businessName ?? '',
        procurementCapacity: body.buyerProfile?.procurementCapacity ?? currentProfile.buyerProfile?.procurementCapacity ?? '',
        preferredCommodities: body.buyerProfile?.preferredCommodities ?? currentProfile.buyerProfile?.preferredCommodities ?? [],
      };
      updates.buyerProfile = nextBuyerProfile;
      if (gstin && gstin !== currentProfile.buyerProfile?.gstin) {
        updates.verification = {
          ...currentProfile.verification,
          buyer: {
            status: 'pending',
            label: 'GSTIN submitted and awaiting admin review',
            submittedAt: new Date().toISOString(),
          },
        };
      }
    }

    if (user.role === 'admin') {
      updates.verification = {
        farmer: null,
        buyer: null,
        admin: null,
      };
    }

    const updated = await platformStore.upsertUserWorkspace(user.email, updates);
    if (!updated) return fail('Profile not found', 404);
    return ok(updated);
  } catch (error) {
    const message = (error as Error).message;
    return fail(message, message === 'Authentication required' ? 401 : 500);
  }
}
