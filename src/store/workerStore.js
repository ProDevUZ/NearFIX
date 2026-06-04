import { create } from "zustand";
import { TRACKING_STATUSES } from "../constants/orderTracking";
import { WORKER_STATUS } from "../constants/workerStatus";
import {
  acceptOrderApi,
  fetchIncomingOrdersApi,
  fetchWorkerEarningsApi,
  fetchWorkerMeApi,
  fetchWorkerOrdersApi,
  fetchWorkerTransactionsApi,
  rejectOrderApi,
  updateAvailabilityApi,
  updateWorkerProfileApi,
  updateOrderStatusApi
} from "../services/workers/workerService";
import { useAuthStore } from "./authStore";

const activeWorkerStatuses = [
  TRACKING_STATUSES.ACCEPTED,
  TRACKING_STATUSES.ON_THE_WAY,
  TRACKING_STATUSES.IN_PROGRESS
];

function resolveOrderStatusKey(order) {
  return order?.statusKey || order?.status;
}

function isActiveWorkerOrder(order) {
  return activeWorkerStatuses.includes(resolveOrderStatusKey(order));
}

export const useWorkerStore = create((set, get) => ({
  workerProfile: null,
  incomingRequests: [],
  activeJob: null,
  operationalStatus: WORKER_STATUS.OFFLINE,
  earnings: {
    todayEarnings: 0,
    weekEarnings: 0,
    monthEarnings: 0,
    completedJobs: 0,
    activeHours: 0,
    averagePerDay: 0,
    growthPercentage: 0,
    platformFees: 0,
    revenueTrend: []
  },
  transactions: [],
  completedOrders: [],
  apiStatus: {
    source: "idle",
    lastError: null
  },
  syncWorkerFromApi: async () => {
    const token = useAuthStore.getState().session?.token;
    if (!token) return { ok: false, message: "No API session token" };

    const [profileResult, incomingResult, ordersResult, earningsResult, transactionsResult] = await Promise.all([
      fetchWorkerMeApi(token),
      fetchIncomingOrdersApi(token),
      fetchWorkerOrdersApi(token),
      fetchWorkerEarningsApi(token),
      fetchWorkerTransactionsApi(token)
    ]);

    set((state) => {
      const activeJob = ordersResult.ok
        ? ordersResult.orders.find(isActiveWorkerOrder) || null
        : state.activeJob;

      return {
        workerProfile: profileResult.ok && profileResult.worker ? { ...(state.workerProfile || {}), ...profileResult.worker } : state.workerProfile,
        operationalStatus: profileResult.ok && profileResult.worker?.availability ? profileResult.worker.availability : state.operationalStatus,
        incomingRequests: incomingResult.ok ? incomingResult.requests : state.incomingRequests,
        activeJob,
        earnings: earningsResult.ok && earningsResult.earnings ? earningsResult.earnings : state.earnings,
        transactions: transactionsResult.ok ? transactionsResult.transactions : state.transactions,
        completedOrders: ordersResult.ok
          ? ordersResult.orders.filter((order) => order.statusKey === TRACKING_STATUSES.COMPLETED)
          : state.completedOrders,
        apiStatus: {
          source: profileResult.ok || incomingResult.ok || ordersResult.ok || earningsResult.ok || transactionsResult.ok ? "api" : state.apiStatus.source,
          lastError: null
        }
      };
    });

    return { ok: profileResult.ok || incomingResult.ok || ordersResult.ok };
  },
  setOperationalStatus: async (status) => {
    const token = useAuthStore.getState().session?.token;

    if (token) {
      const result = await updateAvailabilityApi(token, status);
      if (result.ok) {
        set((state) => ({
          operationalStatus: result.availability.status,
          workerProfile: {
            ...state.workerProfile,
            availability: result.availability.status
          },
          apiStatus: {
            source: "api",
            lastError: null
          }
        }));
        return result;
      }
    }

    return { ok: false, message: "Holatni o'zgartirish uchun tizimga kiring." };
  },
  submitWorkerProfile: async (profile) => {
    const token = useAuthStore.getState().session?.token;

    if (token) {
      const result = await updateWorkerProfileApi(token, profile);
      if (result.ok) {
        set((state) => ({
          workerProfile: {
            ...state.workerProfile,
            ...result.worker
          },
          apiStatus: {
            source: "api",
            lastError: null
          }
        }));
        return result;
      }
    }

    return { ok: false, message: "Profilni saqlash uchun tizimga kiring." };
  },
  acceptIncomingRequest: async (requestId) => {
    const token = useAuthStore.getState().session?.token;

    if (token) {
      const result = await acceptOrderApi(token, requestId);
      if (result.ok) {
        set((state) => ({
          incomingRequests: state.incomingRequests.filter((item) => item.id !== requestId),
          operationalStatus: WORKER_STATUS.BUSY,
          workerProfile: {
            ...state.workerProfile,
            availability: WORKER_STATUS.BUSY
          },
          activeJob: {
            ...result.order,
            problemTitle: result.order.title,
            service: result.order.service,
            clientName: result.order.clientName || "Mijoz",
            address: result.order.address,
            estimatedPayment: result.order.amount
          },
          apiStatus: {
            source: "api",
            lastError: null
          }
        }));
        return result;
      }
    }

    return { ok: false, message: "Buyurtmani qabul qilish uchun tizimga kiring." };
  },
  rejectIncomingRequest: async (requestId) => {
    const token = useAuthStore.getState().session?.token;

    if (token) {
      await rejectOrderApi(token, requestId);
    }

    set((state) => ({
      incomingRequests: state.incomingRequests.filter((item) => item.id !== requestId)
    }));
  },
  updateActiveJobStatus: async (statusKey) => {
    const token = useAuthStore.getState().session?.token;
    const activeJob = get().activeJob;

    if (token && activeJob?.id) {
      const result = await updateOrderStatusApi(token, activeJob.id, statusKey);
      if (result.ok) {
        set((state) => ({
          activeJob: state.activeJob ? { ...state.activeJob, ...result.order } : result.order
        }));
        return result;
      }
    }

    return { ok: false, message: "Faol ish topilmadi." };
  },
  completeActiveJob: async () => {
    const token = useAuthStore.getState().session?.token;
    const activeJob = get().activeJob;

    if (token && activeJob?.id) {
      const result = await updateOrderStatusApi(token, activeJob.id, TRACKING_STATUSES.COMPLETED);
      if (result.ok) {
        set((state) => ({
          activeJob: null,
          operationalStatus: WORKER_STATUS.AVAILABLE,
          workerProfile: {
            ...state.workerProfile,
            availability: WORKER_STATUS.AVAILABLE,
            completedOrders: (state.workerProfile.completedOrders || 0) + 1
          },
          earnings: {
            ...state.earnings,
            completedJobs: state.earnings.completedJobs + 1
          },
          completedOrders: [result.order, ...state.completedOrders]
        }));
        return result;
      }
    }

    return { ok: false, message: "Faol ish topilmadi." };
  }
}));
