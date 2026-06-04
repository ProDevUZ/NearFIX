export const LANGUAGES = {
  uz: "O'zbekcha",
  en: "English",
  ru: "Русский"
};

export const translations = {
  uz: {
    home: "Uy",
    orders: "Buyurtmalar",
    notifications: "Bildirishnomalar",
    chats: "Chatlar",
    profile: "Profil",
    paymentMethods: "To'lov usullari",
    add: "Qo'shish",
    settings: "Sozlamalar",
    personalInfo: "Shaxsiy ma'lumotlar",
    fullName: "Ism familiya",
    phone: "Telefon raqam",
    security: "Xavfsizlik",
    addresses: "Manzillar",
    language: "Til",
    help: "Yordam",
    logout: "Chiqish",
    logoutTitle: "Hisobdan chiqish",
    logoutMessage: "Akkauntingizdan chiqmoqchimisiz?",
    cancel: "Bekor qilish",
    confirmLogout: "Chiqish",
    paymentComingSoon: "To'lov kartalari keyingi bosqichda ulanadi"
  },
  en: {
    home: "Home",
    orders: "Orders",
    notifications: "Notifications",
    chats: "Chats",
    profile: "Profile",
    paymentMethods: "Payment methods",
    add: "Add",
    settings: "Settings",
    personalInfo: "Personal information",
    fullName: "Full name",
    phone: "Phone number",
    security: "Security",
    addresses: "Addresses",
    language: "Language",
    help: "Help",
    logout: "Logout",
    logoutTitle: "Logout",
    logoutMessage: "Do you want to sign out?",
    cancel: "Cancel",
    confirmLogout: "Logout",
    paymentComingSoon: "Payment cards will be connected in the next stage"
  },
  ru: {
    home: "Главная",
    orders: "Заказы",
    notifications: "Уведомления",
    chats: "Чаты",
    profile: "Профиль",
    paymentMethods: "Способы оплаты",
    add: "Добавить",
    settings: "Настройки",
    personalInfo: "Личные данные",
    fullName: "Имя и фамилия",
    phone: "Номер телефона",
    security: "Безопасность",
    addresses: "Адреса",
    language: "Язык",
    help: "Помощь",
    logout: "Выйти",
    logoutTitle: "Выход",
    logoutMessage: "Вы хотите выйти из аккаунта?",
    cancel: "Отмена",
    confirmLogout: "Выйти",
    paymentComingSoon: "Платежные карты будут подключены на следующем этапе"
  }
};

export function translate(locale, key) {
  return translations[locale]?.[key] || translations.uz[key] || key;
}
