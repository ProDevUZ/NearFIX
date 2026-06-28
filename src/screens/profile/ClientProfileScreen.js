import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Keyboard, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  Bell,
  Ban,
  ChevronRight,
  Check,
  CircleHelp,
  Edit3,
  FileText,
  Globe2,
  LogOut,
  MapPin,
  Plus,
  Shield,
  Trash2,
  UserRound,
  Wrench
} from "lucide-react-native";
import { ROUTES } from "../../constants/routes";
import { LANGUAGES, translate } from "../../i18n/translations";
import { fetchUnreadNotificationCountApi } from "../../services/notifications/notificationService";
import { useAuthStore } from "../../store/authStore";
import { useClientStore } from "../../store/clientStore";
import { useUiStore } from "../../store/uiStore";
import { openPrivacyPolicy, openTerms } from "../../utils/legalLinks";
import { SupportRequestModal } from "../../components/support/SupportRequestModal";
import { fetchBlockedUsersApi, unblockUserApi } from "../../services/moderation/moderationService";

const font = {
  medium: "Inter_500Medium",
  semi: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extra: "Inter_800ExtraBold"
};

const addressNameSuggestions = ["Uy", "Ofis", "Ish", "Ota-ona uyi"];

export function ClientProfileScreen({ navigation, route }) {
  const session = useAuthStore((state) => state.session);
  const logout = useAuthStore((state) => state.logout);
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const user = useClientStore((state) => state.user);
  const savedAddresses = useClientStore((state) => state.savedAddresses);
  const addressStatus = useClientStore((state) => state.addressStatus);
  const loadAddresses = useClientStore((state) => state.loadAddresses);
  const createAddress = useClientStore((state) => state.createAddress);
  const updateAddress = useClientStore((state) => state.updateAddress);
  const removeAddress = useClientStore((state) => state.removeAddress);
  const syncClientProfileFromApi = useClientStore((state) => state.syncClientProfileFromApi);
  const clearUserData = useClientStore((state) => state.clearUserData);
  const locale = useUiStore((state) => state.locale);
  const setLocale = useUiStore((state) => state.setLocale);
  const [nameDraft, setNameDraft] = useState(session?.name || user.name || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [addressesOpen, setAddressesOpen] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [addressFormMode, setAddressFormMode] = useState("create");
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const [addressDraft, setAddressDraft] = useState({
    title: "",
    address: "",
    latitude: null,
    longitude: null,
    isDefault: false
  });

  const profile = useMemo(
    () => ({
      name: session?.name || user.name || "Ism kiritilmagan",
      phone: session?.phone || "Telefon kiritilmagan"
    }),
    [session?.name, session?.phone, user.name]
  );

  useEffect(() => {
    setNameDraft(session?.name || user.name || "");
  }, [session?.name, user.name]);

  useEffect(() => {
    syncClientProfileFromApi();
  }, [syncClientProfileFromApi]);

  const loadUnreadNotifications = useCallback(async () => {
    if (!session?.token) {
      setUnreadNotifications(0);
      return;
    }

    const result = await fetchUnreadNotificationCountApi(session.token);
    if (result.ok) setUnreadNotifications(result.count);
  }, [session?.token]);

  useFocusEffect(
    useCallback(() => {
      loadUnreadNotifications();
    }, [loadUnreadNotifications])
  );

  useEffect(() => {
    const selectedLocation = route?.params?.selectedLocation;

    if (!selectedLocation) return;

    setAddressDraft((current) => ({
      ...current,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude
    }));
    setAddressesOpen(true);
    setAddressModalOpen(true);
    navigation.setParams({ selectedLocation: undefined });
  }, [navigation, route?.params?.selectedLocation]);

  function handleLogout() {
    Alert.alert(translate(locale, "logoutTitle"), translate(locale, "logoutMessage"), [
      { text: translate(locale, "cancel"), style: "cancel" },
      {
        text: translate(locale, "confirmLogout"),
        style: "destructive",
        onPress: logout
      }
    ]);
  }

  function confirmDeleteAccount() {
    if (deletingAccount) return;

    Alert.alert(
      "Hisobni o'chirish",
      "Profil ma'lumotlari anonimlashtiriladi. Saqlangan manzillar, sevimlilar va faol sessiyalar o'chiriladi. Buyurtma va chat tarixi qonuniy yoki operatsion zarurat uchun anonim ko'rinishda saqlanishi mumkin.",
      [
        { text: "Bekor qilish", style: "cancel" },
        {
          text: "Davom etish",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Qayta tiklab bo'lmaydi",
              "Hisobni o'chirishni aniq tasdiqlaysizmi?",
              [
                { text: "Yo'q", style: "cancel" },
                {
                  text: "Hisobni o'chirish",
                  style: "destructive",
                  onPress: handleDeleteAccount
                }
              ]
            );
          }
        }
      ]
    );
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    const result = await deleteAccount();

    if (!result.ok) {
      setDeletingAccount(false);
      Alert.alert("Hisob o'chirilmadi", result.message || "Qayta urinib ko'ring.");
      return;
    }

    clearUserData();
    Alert.alert("Hisob o'chirildi", "Shaxsiy ma'lumotlaringiz anonimlashtirildi.");
  }

  async function handleSaveProfile() {
    const cleanName = nameDraft.trim();
    if (cleanName.length < 2) {
      Alert.alert("Ism kerak", "Kamida 2 ta belgidan iborat ism kiriting.");
      return;
    }

    setSavingProfile(true);
    const result = await updateProfile({ name: cleanName });
    setSavingProfile(false);

    Alert.alert(result.ok ? "Saqlandi" : "Xatolik", result.ok ? "Shaxsiy ma'lumotlar yangilandi." : result.message || "Profil saqlanmadi.");
  }

  async function handleRefresh() {
    setRefreshing(true);
    await syncClientProfileFromApi();
    setRefreshing(false);
  }

  function makeEmptyAddressDraft() {
    return {
      title: "",
      address: "",
      latitude: null,
      longitude: null,
      isDefault: savedAddresses.length === 0
    };
  }

  function handleToggleAddresses() {
    const nextOpen = !addressesOpen;
    setAddressesOpen(nextOpen);
    if (nextOpen) loadAddresses();
  }

  function openAddressPicker(initialCoordinate) {
    setAddressModalOpen(false);
    navigation.navigate(ROUTES.MAP_PICKER, {
      returnTo: ROUTES.CLIENT_TABS,
      returnScreen: ROUTES.PROFILE_TAB,
      returnParamKey: "selectedLocation",
      initialCoordinate
    });
  }

  function handleCreateAddressPress() {
    setAddressFormMode("create");
    setEditingAddressId(null);
    setAddressDraft(makeEmptyAddressDraft());
    setAddressModalOpen(true);
  }

  function handleEditAddressPress(address) {
    setAddressFormMode("edit");
    setEditingAddressId(address.id);
    setAddressDraft({
      title: address.title || address.label || "",
      address: address.address || address.addressText || "",
      latitude: address.latitude ?? address.lat ?? null,
      longitude: address.longitude ?? address.lng ?? null,
      isDefault: Boolean(address.isDefault)
    });
    setAddressModalOpen(true);
  }

  function handlePickAddressLocation() {
    openAddressPicker(
      typeof addressDraft.latitude === "number" && typeof addressDraft.longitude === "number"
        ? { latitude: addressDraft.latitude, longitude: addressDraft.longitude }
        : undefined
    );
  }

  async function handleSaveAddress() {
    const cleanTitle = addressDraft.title.trim() || `Manzil ${savedAddresses.length + 1}`;

    if (cleanTitle.length < 2) {
      Alert.alert("Nom kerak", "Masalan: Uy, Ofis yoki Ish deb yozing.");
      return;
    }

    if (addressFormMode === "create" && (typeof addressDraft.latitude !== "number" || typeof addressDraft.longitude !== "number")) {
      Alert.alert("Lokatsiya kerak", "Manzilni saqlash uchun xaritadan nuqta tanlang.");
      return;
    }

    setSavingAddress(true);
    const payload = {
      title: cleanTitle,
      address: cleanTitle,
      ...(typeof addressDraft.latitude === "number" && typeof addressDraft.longitude === "number"
        ? {
            lat: addressDraft.latitude,
            lng: addressDraft.longitude
          }
        : {})
    };
    const result =
      addressFormMode === "edit" && editingAddressId
        ? await updateAddress(editingAddressId, { ...payload, isDefault: addressDraft.isDefault })
        : await createAddress({ ...payload, isDefault: addressDraft.isDefault });
    setSavingAddress(false);

    if (!result.ok) {
      Alert.alert(addressFormMode === "edit" ? "Manzil saqlanmadi" : "Manzil qo'shilmadi", result.message || "Qayta urinib ko'ring.");
      return;
    }

    setAddressModalOpen(false);
    setAddressesOpen(true);
  }

  function confirmDeleteAddress(addressId) {
    Alert.alert("Manzil o'chirilsinmi?", "Bu manzil profil ro'yxatidan olib tashlanadi.", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: async () => {
          const result = await removeAddress(addressId);
          if (!result.ok) Alert.alert("Manzil o'chirilmadi", result.message || "Qayta urinib ko'ring.");
        }
      }
    ]);
  }

  async function handleSetDefaultAddress(addressId) {
    const result = await updateAddress(addressId, { isDefault: true });
    if (!result.ok) Alert.alert("Asosiy manzil saqlanmadi", result.message || "Qayta urinib ko'ring.");
  }

  async function openBlockedUsers() {
    setBlockedOpen(true);
    if (!session?.token) return;
    setBlockedLoading(true);
    const result = await fetchBlockedUsersApi(session.token);
    setBlockedLoading(false);
    if (result.ok) setBlockedUsers(result.blocks);
  }

  async function handleUnblock(blockedUserId) {
    const result = await unblockUserApi(session?.token, blockedUserId);
    if (!result.ok) {
      Alert.alert("Blokdan chiqarilmadi", result.message || "Qayta urinib ko‘ring.");
      return;
    }
    setBlockedUsers((current) => current.filter((item) => item.blockedUserId !== blockedUserId));
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0F80B7" colors={["#0F80B7"]} />}
      >
        <View style={styles.hero}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Wrench size={25} color="#FFFFFF" strokeWidth={3} />
            </View>
            <Text style={styles.logoText}>Near<Text style={styles.logoAccent}>FIX</Text></Text>
          </View>
          <Pressable style={styles.notificationButton} onPress={() => navigation.navigate(ROUTES.NOTIFICATIONS)}>
            <Bell size={23} color="#273248" strokeWidth={2.6} />
            {unreadNotifications > 0 ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadNotifications > 99 ? "99+" : unreadNotifications}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>{translate(locale, "settings")}</Text>
        <View style={styles.settingsCard}>
          <SettingRow
            icon={UserRound}
            iconColor="#0F80B7"
            iconBg="#EAF8FC"
            title={translate(locale, "personalInfo")}
            detail={
              <View style={styles.personalDetails}>
                <Text style={styles.detailText}>{translate(locale, "fullName")}</Text>
                <TextInput
                  autoCapitalize="words"
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  placeholder="Ism"
                  placeholderTextColor="#A0A7B3"
                  style={styles.profileInput}
                />
                <Text style={styles.detailText}>{translate(locale, "phone")}: {profile.phone}</Text>
                <Pressable onPress={handleSaveProfile} disabled={savingProfile} style={[styles.saveProfileButton, savingProfile && styles.saveProfileButtonMuted]}>
                  <Text style={styles.saveProfileText}>{savingProfile ? "Saqlanmoqda..." : "Saqlash"}</Text>
                </Pressable>
              </View>
            }
          />
          <SettingRow
            icon={MapPin}
            iconColor="#0F80B7"
            iconBg="#EAF8FC"
            title={translate(locale, "addresses")}
            subtitle={`${savedAddresses.length} ta manzil`}
            expanded={addressesOpen}
            onPress={handleToggleAddresses}
            detail={
              addressesOpen ? (
                <AddressManager
                  addresses={savedAddresses}
                  loading={addressStatus.loading}
                  saving={addressStatus.saving}
                  error={addressStatus.error}
                  onAdd={handleCreateAddressPress}
                  onEdit={handleEditAddressPress}
                  onDelete={confirmDeleteAddress}
                  onSetDefault={handleSetDefaultAddress}
                  onRetry={loadAddresses}
                />
              ) : null
            }
          />
          <SettingRow
            icon={Globe2}
            iconColor="#9B51E0"
            iconBg="#F5EAFF"
            title={translate(locale, "language")}
            subtitle={LANGUAGES[locale]}
            detail={
              <View style={styles.languageRow}>
                {Object.entries(LANGUAGES).map(([code, label]) => {
                  const active = locale === code;
                  return (
                    <Pressable key={code} onPress={() => setLocale(code)} style={[styles.languageChip, active && styles.languageChipActive]}>
                      <Text style={[styles.languageText, active && styles.languageTextActive]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            }
          />
          <SettingRow icon={CircleHelp} iconColor="#6B7280" iconBg="#F1F5F9" title={translate(locale, "help")} onPress={() => setSupportOpen(true)} />
          <SettingRow icon={Ban} iconColor="#EF4444" iconBg="#FEECEC" title="Bloklangan foydalanuvchilar" onPress={openBlockedUsers} />
          <SettingRow
            icon={Shield}
            iconColor="#0F80B7"
            iconBg="#EAF8FC"
            title="Maxfiylik siyosati"
            onPress={openPrivacyPolicy}
          />
          <SettingRow
            icon={FileText}
            iconColor="#6D5BD0"
            iconBg="#F3F0FF"
            title="Foydalanish shartlari"
            onPress={openTerms}
          />
          <SettingRow
            icon={Trash2}
            iconColor="#EF4444"
            iconBg="#FEECEC"
            title={deletingAccount ? "Hisob o'chirilmoqda..." : "Hisobni o'chirish"}
            onPress={confirmDeleteAccount}
          />
          <Pressable onPress={handleLogout} style={styles.logoutRow}>
            <View style={styles.logoutIcon}>
              <LogOut size={22} color="#EF4444" strokeWidth={2.6} />
            </View>
            <Text style={styles.logoutText}>{translate(locale, "logout")}</Text>
          </Pressable>
        </View>
      </ScrollView>
      <AddressFormModal
        visible={addressModalOpen}
        draft={addressDraft}
        saving={savingAddress}
        onChange={setAddressDraft}
        onClose={() => setAddressModalOpen(false)}
        onPickLocation={handlePickAddressLocation}
        onSave={handleSaveAddress}
        mode={addressFormMode}
      />
      <SupportRequestModal
        visible={supportOpen}
        initialReason="Ilova bo‘yicha yordam"
        onClose={() => setSupportOpen(false)}
        onSuccess={() => Alert.alert("Murojaat yuborildi", "Yordam jamoasi murojaatingizni ko‘rib chiqadi.")}
      />
      <BlockedUsersModal
        visible={blockedOpen}
        loading={blockedLoading}
        blocks={blockedUsers}
        onUnblock={handleUnblock}
        onClose={() => setBlockedOpen(false)}
      />
    </View>
  );
}

function BlockedUsersModal({ visible, loading, blocks, onUnblock, onClose }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.blockedSheet}>
          <Text style={styles.modalTitle}>Bloklangan foydalanuvchilar</Text>
          {loading ? <ActivityIndicator color="#0F80B7" /> : null}
          {!loading && !blocks.length ? <Text style={styles.blockedEmpty}>Bloklangan foydalanuvchilar yo‘q.</Text> : null}
          {blocks.map((block) => (
            <View key={block.blockedUserId} style={styles.blockedRow}>
              <View style={styles.blockedBody}>
                <Text style={styles.blockedName}>{block.blockedUser?.name || "Foydalanuvchi"}</Text>
                <Text style={styles.blockedRole}>{block.blockedUser?.role === "PROVIDER" ? "Usta" : "Foydalanuvchi"}</Text>
              </View>
              <Pressable onPress={() => onUnblock(block.blockedUserId)} style={styles.unblockButton}>
                <Text style={styles.unblockText}>Blokdan chiqarish</Text>
              </Pressable>
            </View>
          ))}
          <Pressable onPress={onClose} style={styles.modalCancelButton}>
            <Text style={styles.modalCancelText}>Yopish</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function SettingRow({ icon: Icon, iconColor, iconBg, title, subtitle, detail, onPress, expanded }) {
  const content = (
    <>
      <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
        <Icon size={22} color={iconColor} strokeWidth={2.6} />
      </View>
      <View style={styles.settingBody}>
        <View style={styles.settingTop}>
          <View style={styles.settingTextWrap}>
            <Text style={styles.settingTitle}>{title}</Text>
            {subtitle ? <Text style={styles.settingSubtitle}>{subtitle}</Text> : null}
          </View>
          <ChevronRight size={24} color="#D1D5DB" strokeWidth={2.7} style={expanded && styles.chevronOpen} />
        </View>
        {detail}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.settingRow, pressed && styles.settingRowPressed]}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={styles.settingRow}>
      {content}
    </View>
  );
}

function AddressManager({ addresses, loading, saving, error, onAdd, onEdit, onDelete, onSetDefault, onRetry }) {
  return (
    <View style={styles.addressManager}>
      <Pressable
        onPress={(event) => {
          event.stopPropagation?.();
          onAdd();
        }}
        style={styles.addAddressButton}
      >
        <Plus size={19} color="#FFFFFF" strokeWidth={2.8} />
        <Text style={styles.addAddressText}>Yangi manzil qo'shish</Text>
      </Pressable>
      {loading ? (
        <View style={styles.addressStateBox}>
          <ActivityIndicator color="#0F80B7" />
          <Text style={styles.addressStateText}>Manzillar yuklanmoqda...</Text>
        </View>
      ) : null}
      {error ? (
        <Pressable onPress={onRetry} style={styles.addressError}>
          <Text style={styles.addressErrorTitle}>Manzillar yuklanmadi</Text>
          <Text style={styles.addressErrorText}>{error}</Text>
          <Text style={styles.addressRetryText}>Qayta urinish</Text>
        </Pressable>
      ) : null}
      {!loading && !error && !addresses.length ? (
        <View style={styles.addressEmpty}>
          <Text style={styles.addressEmptyTitle}>Manzillar yo'q</Text>
          <Text style={styles.addressEmptyText}>Manzil nomini yozing va xaritadan nuqtani tanlang.</Text>
        </View>
      ) : null}
      {addresses.map((address) => (
        <View key={address.id} style={styles.addressItem}>
          <View style={styles.addressPin}>
            <MapPin size={18} color="#0F80B7" strokeWidth={2.7} />
          </View>
          <View style={styles.addressItemBody}>
            <View style={styles.addressTitleRow}>
              <Text style={styles.addressLabel}>{address.title || address.label || "Manzil"}</Text>
              {address.isDefault ? (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Asosiy</Text>
                </View>
              ) : null}
            </View>
            {(address.addressText || address.address) && (address.addressText || address.address) !== (address.title || address.label) ? (
              <Text style={styles.addressText} numberOfLines={2}>
                {address.addressText || address.address}
              </Text>
            ) : null}
            <Text style={styles.addressDistrict}>
              {typeof address.lat === "number" && typeof address.lng === "number"
                ? `${address.lat.toFixed(6)}, ${address.lng.toFixed(6)}`
                : "Koordinata yo'q"}
            </Text>
            <View style={styles.addressActionsRow}>
              <Pressable
                onPress={(event) => {
                  event.stopPropagation?.();
                  onEdit(address);
                }}
                style={styles.addressTextButton}
              >
                <Edit3 size={13} color="#0F80B7" strokeWidth={2.6} />
                <Text style={styles.addressTextButtonLabel}>Tahrirlash</Text>
              </Pressable>
              {!address.isDefault ? (
                <Pressable
                  disabled={saving}
                  onPress={(event) => {
                    event.stopPropagation?.();
                    onSetDefault(address.id);
                  }}
                  style={styles.addressTextButton}
                >
                  <Check size={13} color="#16A34A" strokeWidth={2.8} />
                  <Text style={[styles.addressTextButtonLabel, styles.addressDefaultText]}>Asosiy qilish</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          <Pressable
            onPress={(event) => {
              event.stopPropagation?.();
              onDelete(address.id);
            }}
            style={styles.deleteAddressButton}
          >
            <Trash2 size={17} color="#EF4444" strokeWidth={2.6} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function AddressFormModal({ visible, draft, saving, mode, onChange, onClose, onPickLocation, onSave }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={Keyboard.dismiss}>
        <Pressable
          style={styles.modalSheet}
          onPress={(event) => {
            event.stopPropagation();
            Keyboard.dismiss();
          }}
        >
          <Text style={styles.modalTitle}>{mode === "edit" ? "Manzilni tahrirlash" : "Yangi manzil"}</Text>
          <Text style={styles.modalHint}>Faqat manzil nomini kiriting. Lokatsiyani xaritadan tanlang.</Text>
          <TextInput
            value={draft.title}
            onChangeText={(title) => onChange((current) => ({ ...current, title }))}
            placeholder="Uy, Ofis, Ish..."
            placeholderTextColor="#A0A7B3"
            style={styles.modalInput}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
          />
          <View style={styles.addressSuggestionRow}>
            {addressNameSuggestions.map((name) => (
              <Pressable
                key={name}
                onPress={() => {
                  Keyboard.dismiss();
                  onChange((current) => ({ ...current, title: name }));
                }}
                style={[styles.addressSuggestionChip, draft.title === name && styles.addressSuggestionChipActive]}
              >
                <Text style={[styles.addressSuggestionText, draft.title === name && styles.addressSuggestionTextActive]}>{name}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.coordinateBox}>
            <Text style={styles.coordinateLabel}>Xaritadan tanlangan koordinata</Text>
            <Text style={styles.coordinateText}>
              {typeof draft.latitude === "number" && typeof draft.longitude === "number"
                ? `${draft.latitude.toFixed(6)}, ${draft.longitude.toFixed(6)}`
                : "Koordinata tanlanmagan"}
            </Text>
          </View>
          <Pressable onPress={onPickLocation} disabled={saving} style={styles.pickLocationButton}>
            <MapPin size={17} color="#0F80B7" strokeWidth={2.7} />
            <Text style={styles.pickLocationText}>
              {typeof draft.latitude === "number" && typeof draft.longitude === "number" ? "Lokatsiyani o'zgartirish" : "Xaritadan lokatsiya tanlash"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onChange((current) => ({ ...current, isDefault: !current.isDefault }))}
            disabled={saving}
            style={[styles.defaultToggle, draft.isDefault && styles.defaultToggleActive]}
          >
            <View style={[styles.defaultToggleBox, draft.isDefault && styles.defaultToggleBoxActive]}>
              {draft.isDefault ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
            </View>
            <Text style={[styles.defaultToggleText, draft.isDefault && styles.defaultToggleTextActive]}>Asosiy manzil qilish</Text>
          </Pressable>
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} disabled={saving} style={styles.modalCancelButton}>
              <Text style={styles.modalCancelText}>Bekor qilish</Text>
            </Pressable>
            <Pressable onPress={onSave} disabled={saving} style={[styles.modalSaveButton, saving && styles.saveProfileButtonMuted]}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalSaveText}>{mode === "edit" ? "Saqlash" : "Qo'shish"}</Text>}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F0F9FB"
  },
  content: {
    paddingBottom: 112
  },
  hero: {
    minHeight: 92,
    paddingTop: 18,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  logoIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#1597A9",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1597A9",
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 14,
    elevation: 5
  },
  logoText: {
    color: "#273248",
    fontSize: 24,
    lineHeight: 29,
    fontFamily: font.extra
  },
  logoAccent: {
    color: "#2CD8A5"
  },
  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F719D",
    shadowOpacity: 0.09,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 5
  },
  notificationBadge: {
    position: "absolute",
    top: -5,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#2CD8A5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: font.extra
  },
  divider: {
    height: 1,
    marginHorizontal: 18,
    backgroundColor: "#DCECF3"
  },
  sectionTitle: {
    marginTop: 20,
    marginHorizontal: 18,
    color: "#273248",
    fontSize: 18,
    lineHeight: 23,
    fontFamily: font.extra
  },
  settingsCard: {
    marginTop: 10,
    marginHorizontal: 18,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#0F719D",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 24,
    elevation: 5
  },
  settingRow: {
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF3F7",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11
  },
  settingRowPressed: {
    backgroundColor: "#F8FCFE"
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  settingBody: {
    flex: 1
  },
  settingTop: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  settingTextWrap: {
    flex: 1
  },
  settingTitle: {
    color: "#273248",
    fontSize: 16,
    lineHeight: 21,
    fontFamily: font.extra
  },
  settingSubtitle: {
    marginTop: 2,
    color: "#6B7280",
    fontSize: 12,
    fontFamily: font.medium
  },
  chevronOpen: {
    transform: [{ rotate: "90deg" }]
  },
  personalDetails: {
    marginTop: 2,
    gap: 7
  },
  detailText: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: font.semi
  },
  profileInput: {
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCECF3",
    backgroundColor: "#F8FCFE",
    paddingHorizontal: 12,
    color: "#273248",
    fontSize: 14,
    fontFamily: font.semi
  },
  saveProfileButton: {
    alignSelf: "flex-start",
    minHeight: 34,
    borderRadius: 12,
    backgroundColor: "#0F80B7",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16
  },
  saveProfileButtonMuted: {
    opacity: 0.65
  },
  saveProfileText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: font.extra
  },
  languageRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  languageChip: {
    borderRadius: 14,
    backgroundColor: "#F3F6FA",
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  languageChipActive: {
    backgroundColor: "#0F80B7"
  },
  languageText: {
    color: "#6B7280",
    fontSize: 12,
    fontFamily: font.extra
  },
  languageTextActive: {
    color: "#FFFFFF"
  },
  logoutRow: {
    minHeight: 62,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 15
  },
  logoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEECEC",
    alignItems: "center",
    justifyContent: "center"
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 16,
    fontFamily: font.extra
  },
  addressManager: {
    marginTop: 6,
    gap: 8
  },
  addAddressButton: {
    alignSelf: "flex-start",
    minHeight: 38,
    borderRadius: 13,
    backgroundColor: "#0F80B7",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  addAddressText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: font.extra
  },
  addressEmpty: {
    borderRadius: 16,
    backgroundColor: "#F6F8FB",
    padding: 14
  },
  addressStateBox: {
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: "#F6F8FB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10
  },
  addressStateText: {
    color: "#6B7280",
    fontSize: 13,
    fontFamily: font.semi
  },
  addressError: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
    padding: 14
  },
  addressErrorTitle: {
    color: "#991B1B",
    fontSize: 15,
    fontFamily: font.extra
  },
  addressErrorText: {
    marginTop: 4,
    color: "#B91C1C",
    fontSize: 12,
    lineHeight: 17,
    fontFamily: font.semi
  },
  addressRetryText: {
    marginTop: 8,
    color: "#0F80B7",
    fontSize: 12,
    fontFamily: font.extra
  },
  addressEmptyTitle: {
    color: "#273248",
    fontSize: 15,
    fontFamily: font.extra
  },
  addressEmptyText: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: font.medium
  },
  addressItem: {
    minHeight: 64,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E5EEF3",
    backgroundColor: "#F8FCFE",
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 11
  },
  addressPin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EAF8FC",
    alignItems: "center",
    justifyContent: "center"
  },
  addressItemBody: {
    flex: 1
  },
  addressTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  addressLabel: {
    flexShrink: 1,
    color: "#273248",
    fontSize: 14,
    fontFamily: font.extra
  },
  defaultBadge: {
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 3
  },
  defaultBadgeText: {
    color: "#16A34A",
    fontSize: 10,
    fontFamily: font.extra
  },
  addressText: {
    marginTop: 3,
    color: "#6B7280",
    fontSize: 11,
    lineHeight: 15,
    fontFamily: font.semi
  },
  addressDistrict: {
    marginTop: 4,
    color: "#0F80B7",
    fontSize: 11,
    fontFamily: font.extra
  },
  addressActionsRow: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  addressTextButton: {
    minHeight: 28,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EEF3",
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  addressTextButtonLabel: {
    color: "#0F80B7",
    fontSize: 11,
    fontFamily: font.extra
  },
  addressDefaultText: {
    color: "#16A34A"
  },
  deleteAddressButton: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(39,50,72,0.36)"
  },
  modalSheet: {
    marginHorizontal: 16,
    marginBottom: 22,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 16,
    gap: 10
  },
  blockedSheet: {
    marginHorizontal: 16,
    marginBottom: 22,
    maxHeight: "70%",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 16,
    gap: 10
  },
  blockedEmpty: {
    color: "#6B7280",
    paddingVertical: 18,
    textAlign: "center",
    fontFamily: font.semi
  },
  blockedRow: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5EEF3",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  blockedBody: {
    flex: 1
  },
  blockedName: {
    color: "#273248",
    fontFamily: font.extra
  },
  blockedRole: {
    marginTop: 3,
    color: "#6B7280",
    fontSize: 12,
    fontFamily: font.semi
  },
  unblockButton: {
    minHeight: 34,
    borderRadius: 11,
    backgroundColor: "#EAF8FC",
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  unblockText: {
    color: "#0F80B7",
    fontSize: 11,
    fontFamily: font.extra
  },
  modalTitle: {
    color: "#273248",
    fontSize: 19,
    fontFamily: font.extra
  },
  modalHint: {
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 17,
    fontFamily: font.semi
  },
  modalInput: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCECF3",
    backgroundColor: "#F8FCFE",
    paddingHorizontal: 13,
    color: "#273248",
    fontSize: 15,
    fontFamily: font.semi
  },
  addressSuggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  addressSuggestionChip: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DCECF3",
    backgroundColor: "#F8FCFE",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  addressSuggestionChipActive: {
    borderColor: "#0F80B7",
    backgroundColor: "#EAF8FC"
  },
  addressSuggestionText: {
    color: "#6B7280",
    fontSize: 12,
    fontFamily: font.extra
  },
  addressSuggestionTextActive: {
    color: "#0F80B7"
  },
  coordinateBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCECF3",
    backgroundColor: "#F8FCFE",
    paddingHorizontal: 13,
    paddingVertical: 10
  },
  coordinateLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontFamily: font.semi
  },
  coordinateText: {
    marginTop: 4,
    color: "#273248",
    fontSize: 13,
    fontFamily: font.extra
  },
  pickLocationButton: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CFE8F0",
    backgroundColor: "#EAF8FC",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  pickLocationText: {
    color: "#0F80B7",
    fontSize: 13,
    fontFamily: font.extra
  },
  defaultToggle: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCECF3",
    backgroundColor: "#F8FCFE",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 9
  },
  defaultToggleActive: {
    borderColor: "#86EFAC",
    backgroundColor: "#F0FFF4"
  },
  defaultToggleBox: {
    width: 20,
    height: 20,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center"
  },
  defaultToggleBoxActive: {
    borderColor: "#16A34A",
    backgroundColor: "#16A34A"
  },
  defaultToggleText: {
    color: "#6B7280",
    fontSize: 13,
    fontFamily: font.extra
  },
  defaultToggleTextActive: {
    color: "#16A34A"
  },
  modalActions: {
    flexDirection: "row",
    gap: 10
  },
  modalCancelButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCECF3",
    alignItems: "center",
    justifyContent: "center"
  },
  modalCancelText: {
    color: "#6B7280",
    fontSize: 14,
    fontFamily: font.extra
  },
  modalSaveButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#2CD8A5",
    alignItems: "center",
    justifyContent: "center"
  },
  modalSaveText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: font.extra
  }
});
