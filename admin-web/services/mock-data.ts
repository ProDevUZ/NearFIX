import type {
  AdminOrder,
  AdminReview,
  AdminUser,
  AdminWorker,
  DashboardSummary
} from "@/contracts/admin";

export const dashboardSummary: DashboardSummary = {
  activeOrders: 18,
  waitingResponse: 6,
  busyWorkers: 14,
  completedToday: 31,
  cancelledToday: 3,
  cityOverview: [
    { city: "Tashkent", activeOrders: 18, availableWorkers: 42 },
    { city: "Andijan", activeOrders: 0, availableWorkers: 0 },
    { city: "Samarkand", activeOrders: 4, availableWorkers: 11 }
  ]
};

export const orders: AdminOrder[] = [
  {
    orderId: "#2451",
    id: "#2451",
    client: "Aziz Karimov",
    worker: "Jasur Usta",
    city: "Tashkent",
    service: "Elektrik",
    status: "waiting",
    createdAt: "2026-05-14 10:24",
    amount: 180000
  },
  {
    orderId: "#2450",
    id: "#2450",
    client: "Madina Aliyeva",
    worker: "Bekzod Santexnik",
    city: "Tashkent",
    service: "Santexnik",
    status: "active",
    createdAt: "2026-05-14 09:52",
    amount: 220000
  },
  {
    orderId: "#2449",
    id: "#2449",
    client: "Dilshod Umarov",
    worker: "Akmal Usta",
    city: "Samarkand",
    service: "Usta",
    status: "completed",
    createdAt: "2026-05-14 08:40",
    amount: 350000
  }
];

export const workers: AdminWorker[] = [
  {
    id: "w-1",
    name: "Jasur Usta",
    phone: "+998 97 777 88 99",
    profession: "Elektrik",
    professions: ["Elektrik"],
    status: "approved",
    city: "Tashkent",
    availability: "available",
    experienceYears: 7,
    basePrice: 180000,
    completedJobs: 124,
    ignoredRequests: 2,
    rating: 4.9,
    totalEarnings: 18400000,
    responseSpeed: "12 min"
  },
  {
    id: "w-2",
    name: "Bekzod Santexnik",
    phone: "+998 90 222 33 44",
    profession: "Santexnik",
    professions: ["Santexnik", "Ta'mirlash"],
    status: "approved",
    city: "Tashkent",
    availability: "busy",
    experienceYears: 9,
    basePrice: 220000,
    completedJobs: 98,
    ignoredRequests: 4,
    rating: 4.8,
    totalEarnings: 14900000,
    responseSpeed: "18 min"
  },
  {
    id: "w-3",
    name: "Akmal Usta",
    phone: "+998 91 333 44 55",
    profession: "Usta",
    professions: ["Usta"],
    status: "approved",
    city: "Samarkand",
    availability: "offline",
    experienceYears: 6,
    basePrice: 160000,
    completedJobs: 76,
    ignoredRequests: 7,
    rating: 4.7,
    totalEarnings: 11600000,
    responseSpeed: "31 min"
  }
];

export const users: AdminUser[] = [
  {
    id: "u-1",
    name: "Aziz Karimov",
    phone: "+998 90 111 22 33",
    role: "client",
    city: "Tashkent",
    registeredAt: "2026-04-21"
  },
  {
    id: "u-2",
    name: "Madina Aliyeva",
    phone: "+998 93 444 55 66",
    role: "client",
    city: "Tashkent",
    registeredAt: "2026-04-28"
  },
  {
    id: "u-3",
    name: "Jasur Usta",
    phone: "+998 97 777 88 99",
    role: "provider",
    city: "Tashkent",
    registeredAt: "2026-03-16"
  }
];

export const reviews: AdminReview[] = [
  {
    id: "r-1",
    worker: "Jasur Usta",
    client: "Aziz Karimov",
    rating: 5,
    text: "Tez keldi, muammo aniq hal qilindi.",
    date: "2026-05-13",
    status: "published"
  },
  {
    id: "r-2",
    worker: "Bekzod Santexnik",
    client: "Madina Aliyeva",
    rating: 5,
    text: "Ish sifati yaxshi, narx oldindan aniq aytildi.",
    date: "2026-05-12",
    status: "published"
  }
];
