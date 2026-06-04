import { TRACKING_STATUSES } from "../../constants/orderTracking";
import { WORKER_STATUS } from "../../constants/workerStatus";
import { apiRequest } from "../api/client";
import { httpAuthRequest } from "../api/authenticatedClient";
import { mapApiOrder } from "../orders/orderService";

function mapAvailability(status) {
  return String(status || "OFFLINE").toLowerCase();
}

function formatRequestAge(createdAt) {
  if (!createdAt) return "Now";

  const minutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function mapApiWorkerProfile(worker) {
  if (!worker) return null;

  const professions = Array.isArray(worker.professions) && worker.professions.length
    ? worker.professions
    : worker.profession
      ? [worker.profession]
      : ["Usta"];

  return {
    id: worker.id,
    userId: worker.userId,
    cityId: worker.user?.cityId,
    status: String(worker.status || "DRAFT").toLowerCase(),
    phone: worker.user?.phone,
    name: worker.user?.name || worker.profession || "NearFIX usta",
    specialty: worker.profession || professions[0] || "Usta",
    professions,
    experienceYears: worker.experienceYears || 0,
    profileImageUrl: worker.profileImageUrl,
    about: worker.bio,
    rating: String(worker.ratingAvg || "0"),
    completedOrders: worker.completedOrdersCount || 0,
    availability: mapAvailability(worker.availability?.status),
    basePriceValue: worker.basePrice || 0,
    price: worker.basePrice ? `${Number(worker.basePrice).toLocaleString("uz-UZ")} so'm` : "Kelishiladi"
  };
}

export async function fetchWorkerMeApi(token) {
  return apiRequest(async () => {
    const payload = await httpAuthRequest("/workers/me", { token });
    return {
      ok: true,
      worker: mapApiWorkerProfile(payload.worker),
      raw: payload.worker
    };
  });
}

export async function fetchWorkerEarningsApi(token) {
  return apiRequest(async () => {
    const payload = await httpAuthRequest("/workers/me/earnings", { token });
    return {
      ok: true,
      earnings: payload.earnings
    };
  });
}

export async function fetchWorkerTransactionsApi(token) {
  return apiRequest(async () => {
    const payload = await httpAuthRequest("/workers/me/transactions", { token });
    return {
      ok: true,
      transactions: payload.transactions || []
    };
  });
}

export async function updateAvailabilityApi(token, status) {
  const apiStatus = String(status || WORKER_STATUS.OFFLINE).toUpperCase();

  return apiRequest(async () => {
    const payload = await httpAuthRequest("/workers/me/availability", {
      method: "PATCH",
      token,
      body: { status: apiStatus }
    });

    return {
      ok: true,
      availability: {
        ...payload.availability,
        status: mapAvailability(payload.availability?.status)
      }
    };
  });
}

export async function updateWorkerProfileApi(token, profile) {
  return apiRequest(async () => {
    const payload = await httpAuthRequest("/workers/me/profile", {
      method: "PATCH",
      token,
      body: profile
    });

    return {
      ok: true,
      worker: mapApiWorkerProfile(payload.worker),
      raw: payload.worker
    };
  });
}

export async function fetchIncomingOrdersApi(token) {
  return apiRequest(async () => {
    const payload = await httpAuthRequest("/orders/worker/incoming", { token });
    return {
      ok: true,
      requests: (payload.orders || []).map((order) => ({
        id: order.id,
        clientName: order.client?.name || "Mijoz",
        district: order.address?.district || order.cityId,
        address: order.address?.addressText || "Manzil kiritilgan",
        distance: order.distance || order.distanceKm ? `${order.distance || order.distanceKm} km` : "Yaqin hudud",
        service: order.serviceType,
        problemTitle: order.problemTitle,
        problemSummary: order.problemDescription || "Tafsilotlar buyurtmada ko'rsatilgan.",
        urgency: order.urgency === "URGENT" ? "Shoshilinch" : order.urgency === "NORMAL" ? "Oddiy" : "Tez",
        estimatedPayment: order.priceEstimate ? `${Number(order.priceEstimate).toLocaleString("uz-UZ")} so'm` : "Kelishiladi",
        createdAt: formatRequestAge(order.createdAt),
        mediaCount: 0,
        statusKey: TRACKING_STATUSES.REQUEST_SENT,
        rawOrder: order
      }))
    };
  });
}

export async function fetchWorkerOrdersApi(token) {
  return apiRequest(async () => {
    const payload = await httpAuthRequest("/orders", { token });
    return {
      ok: true,
      orders: (payload.orders || []).map(mapApiOrder)
    };
  });
}

export async function acceptOrderApi(token, orderId) {
  return apiRequest(async () => {
    const payload = await httpAuthRequest(`/orders/${orderId}/accept`, {
      method: "POST",
      token
    });

    return {
      ok: true,
      order: mapApiOrder(payload.order)
    };
  });
}

export async function updateOrderStatusApi(token, orderId, statusKey) {
  const apiStatusByTracking = {
    [TRACKING_STATUSES.ON_THE_WAY]: "ON_THE_WAY",
    [TRACKING_STATUSES.IN_PROGRESS]: "IN_PROGRESS",
    [TRACKING_STATUSES.COMPLETED]: "COMPLETED"
  };

  return apiRequest(async () => {
    const payload = await httpAuthRequest(`/orders/${orderId}/status`, {
      method: "POST",
      token,
      body: { status: apiStatusByTracking[statusKey] || statusKey }
    });

    return {
      ok: true,
      order: mapApiOrder(payload.order)
    };
  });
}

export async function rejectOrderApi(token, orderId) {
  return apiRequest(async () => {
    const payload = await httpAuthRequest(`/orders/${orderId}/reject`, {
      method: "POST",
      token
    });

    return {
      ok: true,
      order: mapApiOrder(payload.order)
    };
  });
}
