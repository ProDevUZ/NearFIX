import { create } from "zustand";
import { categories, topCategoryIds } from "../constants/categories";
import { DEFAULT_CATALOG_FILTERS } from "../constants/catalog";
import { ORDER_STATES } from "../constants/orderStates";
import { TRACKING_STATUSES } from "../constants/orderTracking";
import { fetchCatalogWorkers } from "../services/catalog/catalogService";
import { cancelOrderApi, createOrderApi, fetchOrdersApi } from "../services/orders/orderService";
import { createAddressApi, deleteAddressApi, getAddressesApi, updateAddressApi } from "../services/addresses/addressService";
import { fetchBannersApi } from "../services/content/bannerService";
import { addFavoriteApi, fetchFavoritesApi, removeFavoriteApi } from "../services/favorites/favoriteService";
import { useAuthStore } from "./authStore";
import { registerSessionResetHandler } from "./sessionReset";

const initialUser = {
  id: null,
  name: null,
  location: null,
  avatarInitials: null
};

const initialOrderDraft = {
  serviceId: null,
  problemTitle: "",
  description: "",
  urgency: "fast",
  photos: [],
  address: "",
  useCurrentLocation: false,
  selectedWorkerId: null,
  status: ORDER_STATES.CREATED
};

export const useClientStore = create((set, get) => ({
  user: initialUser,
  categories,
  topCategoryIds,
  workers: [],
  banners: [],
  orders: [],
  activeOrder: null,
  chatMessages: [],
  savedAddresses: [],
  addressStatus: {
    loading: false,
    saving: false,
    error: null
  },
  selectedCityId: "tashkent",
  favoriteWorkerIds: [],
  apiStatus: {
    catalogSource: "mock",
    ordersSource: "mock",
    lastError: null
  },
  catalogQuery: "",
  catalogFilters: DEFAULT_CATALOG_FILTERS,
  selectedWorkerId: null,
  orderDraft: initialOrderDraft,
  clearUserData: () =>
    set({
      user: initialUser,
      workers: [],
      orders: [],
      activeOrder: null,
      chatMessages: [],
      savedAddresses: [],
      favoriteWorkerIds: [],
      selectedWorkerId: null,
      orderDraft: initialOrderDraft,
      addressStatus: {
        loading: false,
        saving: false,
        error: null
      }
    }),
  setSelectedCity: (cityId) => set({ selectedCityId: cityId }),
  syncCatalogFromApi: async (profession) => {
    const { selectedCityId } = get();
    const result = await fetchCatalogWorkers(selectedCityId, profession);

    if (result.ok) {
      set((state) => ({
        workers: result.workers,
        selectedWorkerId: result.workers.some((worker) => worker.id === state.selectedWorkerId)
          ? state.selectedWorkerId
          : result.workers[0]?.id || null,
        apiStatus: {
          ...state.apiStatus,
          catalogSource: result.source || "api",
          lastError: null
        }
      }));
    }

    return result;
  },
  syncOrdersFromApi: async () => {
    const token = useAuthStore.getState().session?.token;
    if (!token) return { ok: false, message: "No API session token" };

    const result = await fetchOrdersApi(token);
    if (result.ok) {
      const active = result.orders.find((order) =>
        [TRACKING_STATUSES.REQUEST_SENT, TRACKING_STATUSES.ACCEPTED, TRACKING_STATUSES.ON_THE_WAY, TRACKING_STATUSES.IN_PROGRESS].includes(
          order.statusKey
        )
      );

      set((state) => ({
        orders: result.orders,
        activeOrder: active || null,
        apiStatus: {
          ...state.apiStatus,
          ordersSource: "api",
          lastError: null
        }
      }));
    }

    return result;
  },
  syncBannersFromApi: async () => {
    const result = await fetchBannersApi();

    if (result.ok) {
      set({
        banners: result.banners
      });
    }

    return result;
  },
  syncClientProfileFromApi: async () => {
    const token = useAuthStore.getState().session?.token;
    if (!token) return { ok: false, message: "No API session token" };

    const [addressesResult, favoritesResult] = await Promise.all([getAddressesApi(token), fetchFavoritesApi(token)]);

    set((state) => ({
      savedAddresses: addressesResult.ok ? addressesResult.addresses : state.savedAddresses,
      addressStatus: {
        ...state.addressStatus,
        error: addressesResult.ok ? null : addressesResult.message || "Manzillar yuklanmadi"
      },
      favoriteWorkerIds: favoritesResult.ok ? favoritesResult.favoriteWorkerIds : state.favoriteWorkerIds
    }));

    return { ok: addressesResult.ok || favoritesResult.ok };
  },
  loadAddresses: async () => {
    const token = useAuthStore.getState().session?.token;
    if (!token) return { ok: false, message: "Manzillarni yuklash uchun tizimga kiring." };

    set((state) => ({
      addressStatus: {
        ...state.addressStatus,
        loading: true,
        error: null
      }
    }));

    const result = await getAddressesApi(token);

    set((state) => ({
      savedAddresses: result.ok ? result.addresses : state.savedAddresses,
      addressStatus: {
        ...state.addressStatus,
        loading: false,
        error: result.ok ? null : result.message || "Manzillar yuklanmadi"
      }
    }));

    return result;
  },
  setCatalogQuery: (query) => set({ catalogQuery: query }),
  updateCatalogFilters: (patch) =>
    set((state) => ({
      catalogFilters: {
        ...state.catalogFilters,
        ...patch
      }
    })),
  resetCatalogFilters: () => set({ catalogFilters: DEFAULT_CATALOG_FILTERS }),
  toggleFavoriteWorker: async (workerId) => {
    const token = useAuthStore.getState().session?.token;
    const isFavorite = get().favoriteWorkerIds.includes(workerId);

    if (token) {
      if (isFavorite) await removeFavoriteApi(token, workerId);
      else await addFavoriteApi(token, workerId);
    }

    set((state) => ({
      favoriteWorkerIds: state.favoriteWorkerIds.includes(workerId)
        ? state.favoriteWorkerIds.filter((id) => id !== workerId)
        : [...state.favoriteWorkerIds, workerId]
    }));
  },
  createAddress: async (address) => {
    const token = useAuthStore.getState().session?.token;
    const tempId = `address-${Date.now()}`;
    const optimisticAddress = {
      id: tempId,
      title: address.title || address.label,
      label: address.title || address.label,
      address: address.address || address.addressText,
      addressText: address.address || address.addressText,
      lat: address.lat ?? address.latitude ?? null,
      lng: address.lng ?? address.longitude ?? null,
      latitude: address.lat ?? address.latitude ?? null,
      longitude: address.lng ?? address.longitude ?? null,
      isDefault: Boolean(address.isDefault)
    };

    if (!token) return { ok: false, message: "Manzil qo'shish uchun tizimga kiring." };

    set((state) => ({
      savedAddresses: [
        ...state.savedAddresses.map((item) => (optimisticAddress.isDefault ? { ...item, isDefault: false } : item)),
        optimisticAddress
      ],
      addressStatus: {
        ...state.addressStatus,
        saving: true,
        error: null
      }
    }));

    const result = await createAddressApi(token, address);

    if (result.ok) {
      set((state) => ({
        savedAddresses: state.savedAddresses.map((item) =>
          item.id === tempId ? { ...result.address, isDefault: optimisticAddress.isDefault } : item
        ),
        addressStatus: {
          ...state.addressStatus,
          saving: false,
          error: null
        }
      }));
      return result;
    }

    set((state) => ({
      savedAddresses: state.savedAddresses.filter((item) => item.id !== tempId),
      addressStatus: {
        ...state.addressStatus,
        saving: false,
        error: result.message || "Manzil qo'shilmadi"
      }
    }));

    return result;
  },
  updateAddress: async (addressId, patch) => {
    const token = useAuthStore.getState().session?.token;
    if (!token) return { ok: false, message: "Manzilni yangilash uchun tizimga kiring." };

    const previousAddresses = get().savedAddresses;
    const optimisticPatch = {
      ...(patch.title || patch.label ? { title: patch.title || patch.label, label: patch.title || patch.label } : {}),
      ...(patch.address || patch.addressText ? { address: patch.address || patch.addressText, addressText: patch.address || patch.addressText } : {}),
      ...(patch.lat !== undefined || patch.latitude !== undefined ? { lat: patch.lat ?? patch.latitude, latitude: patch.lat ?? patch.latitude } : {}),
      ...(patch.lng !== undefined || patch.longitude !== undefined ? { lng: patch.lng ?? patch.longitude, longitude: patch.lng ?? patch.longitude } : {}),
      ...(patch.isDefault !== undefined ? { isDefault: patch.isDefault } : {})
    };

    set((state) => ({
      savedAddresses: state.savedAddresses.map((address) => {
        if (patch.isDefault && address.id !== addressId) return { ...address, isDefault: false };
        if (address.id === addressId) return { ...address, ...optimisticPatch };
        return address;
      }),
      addressStatus: {
        ...state.addressStatus,
        saving: true,
        error: null
      }
    }));

    const result = await updateAddressApi(token, addressId, patch);

    if (result.ok) {
      set((state) => ({
        savedAddresses: state.savedAddresses.map((address) =>
          address.id === addressId
            ? { ...result.address, isDefault: patch.isDefault !== undefined ? patch.isDefault : address.isDefault }
            : address
        ),
        addressStatus: {
          ...state.addressStatus,
          saving: false,
          error: null
        }
      }));
      return result;
    }

    set((state) => ({
      savedAddresses: previousAddresses,
      addressStatus: {
        ...state.addressStatus,
        saving: false,
        error: result.message || "Manzil yangilanmadi"
      }
    }));

    return result;
  },
  removeAddress: async (addressId) => {
    const token = useAuthStore.getState().session?.token;
    if (!token) return { ok: false, message: "Manzilni o'chirish uchun tizimga kiring." };

    const previousAddresses = get().savedAddresses;

    set((state) => ({
      savedAddresses: state.savedAddresses.filter((address) => address.id !== addressId),
      addressStatus: {
        ...state.addressStatus,
        saving: true,
        error: null
      }
    }));

    const result = await deleteAddressApi(token, addressId);

    if (result.ok) {
      set((state) => ({
        addressStatus: {
          ...state.addressStatus,
          saving: false,
          error: null
        }
      }));
      return result;
    }

    set((state) => ({
      savedAddresses: previousAddresses,
      addressStatus: {
        ...state.addressStatus,
        saving: false,
        error: result.message || "Manzil o'chirilmadi"
      }
    }));

    return result;
  },
  addSavedAddress: async (address) => {
    return get().createAddress(address);
  },
  removeSavedAddress: async (addressId) => {
    return get().removeAddress(addressId);
  },
  selectWorker: (workerId) => set({ selectedWorkerId: workerId }),
  getSelectedWorker: () => {
    const { selectedWorkerId, workers: workerList } = get();
    return workerList.find((worker) => worker.id === selectedWorkerId) || workerList[0] || null;
  },
  resetOrderDraft: (patch = {}) =>
    set({
      orderDraft: {
        ...initialOrderDraft,
        ...patch
      }
    }),
  updateOrderDraft: (patch) =>
    set((state) => ({
      orderDraft: {
        ...state.orderDraft,
        ...patch
      }
    })),
  setOrderStatus: (status) =>
    set((state) => ({
      orderDraft: {
        ...state.orderDraft,
        status
      }
    })),
  sendMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, ["out", message]]
    })),
  createOrderFromDraft: async () => {
    const state = get();
    const service = state.categories.find((item) => item.id === state.orderDraft.serviceId);
    const worker = state.workers.find((item) => item.id === state.orderDraft.selectedWorkerId) || state.getSelectedWorker();
    const token = useAuthStore.getState().session?.token;

    if (!token) {
      return { ok: false, message: "Buyurtma berish uchun tizimga kiring." };
    }

    if (token && worker?.id) {
      const result = await createOrderApi(token, state.orderDraft, service, worker);

      if (result.ok) {
        set((current) => ({
          activeOrder: result.order,
          orders: [result.order, ...current.orders.filter((order) => order.id !== result.order.id)],
          selectedWorkerId: worker.id,
          orderDraft: {
            ...current.orderDraft,
            selectedWorkerId: worker.id,
            status: ORDER_STATES.IN_PROGRESS
          },
          apiStatus: {
            ...current.apiStatus,
            ordersSource: "api",
            lastError: null
          }
        }));
        return result;
      }

      return result;
    }

    return { ok: false, message: "Usta tanlanmagan." };
  },
  cancelActiveOrder: async (reason) => {
    const state = get();
    const token = useAuthStore.getState().session?.token;

    if (!token || !state.activeOrder?.id) return { ok: false, message: "Faol buyurtma topilmadi." };

    const result = await cancelOrderApi(token, state.activeOrder.id, reason);
    if (result.ok) {
      set((current) => ({
        activeOrder: result.order,
        orders: [result.order, ...current.orders.filter((order) => order.id !== result.order.id)]
      }));
    }

    return result;
  }
}));

registerSessionResetHandler(() => useClientStore.getState().clearUserData());
