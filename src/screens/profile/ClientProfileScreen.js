import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  Bell,
  ChevronRight,
  Check,
  CircleHelp,
  Edit3,
  Globe2,
  LogOut,
  MapPin,
  Plus,
  Shield,
  Trash2,
  UserRound,
  WalletCards,
  Wrench
} from "lucide-react-native";
import { ROUTES } from "../../constants/routes";
import { LANGUAGES, translate } from "../../i18n/translations";
import { useAuthStore } from "../../store/authStore";
import { useClientStore } from "../../store/clientStore";
import { useUiStore } from "../../store/uiStore";

const font = {
  medium: "Inter_500Medium",
  semi: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extra: "Inter_800ExtraBold"
};

export function ClientProfileScreen({ navigation, route }) {
  const session = useAuthStore((state) => state.session);
  const logout = useAuthStore((state) => state.logout);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const user = useClientStore((state) => state.user);
  const savedAddresses = useClientStore((state) => state.savedAddresses);
  const addressStatus = useClientStore((state) => state.addressStatus);
  const loadAddresses = useClientStore((state) => state.loadAddresses);
  const createAddress = useClientStore((state) => state.createAddress);
  const updateAddress = useClientStore((state) => state.updateAddress);
  const removeAddress = useClientStore((state) => state.removeAddress);
  const syncClientProfileFromApi = useClientStore((state) => state.syncClientProfileFromApi);
  const locale = useUiStore((state) => state.locale);
  const setLocale = useUiStore((state) => state.setLocale);
  const [nameDraft, setNameDraft] = useState(session?.name || user.name || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [addressesOpen, setAddressesOpen] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [addressFormMode, setAddressFormMode] = useState("create");
  const [editingAddressId, setEditingAddressId] = useState(null);
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

  function showComingSoon() {
    Alert.alert("NearFIX", translate(locale, "paymentComingSoon"));
  }

  async function handleSaveProfile() {
    const cleanName = nameDraft.trim();
    if (cleanName.length < 2) {
      Alert.alert("Ism familiya kerak", "Kamida 2 ta belgidan iborat ism familiya kiriting.");
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
    openAddressPicker();
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
    const cleanAddress = addressDraft.address.trim();
    const cleanTitle = addressDraft.title.trim() || `Manzil ${savedAddresses.length + 1}`;

    if (cleanAddress.length < 5) {
      Alert.alert("Manzil kerak", "Uy, ko'cha yoki mo'ljalni kiriting.");
      return;
    }

    if (addressFormMode === "create" && (typeof addressDraft.latitude !== "number" || typeof addressDraft.longitude !== "number")) {
      Alert.alert("Lokatsiya kerak", "Manzilni saqlash uchun xaritadan nuqta tanlang.");
      return;
    }

    setSavingAddress(true);
    const payload = {
      title: cleanTitle,
      address: cleanAddress,
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
    if (!result.ok) Alert.alert("Default manzil saqlanmadi", result.message || "Qayta urinib ko'ring.");
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
          <Pressable style={styles.notificationButton}>
            <Bell size={23} color="#273248" strokeWidth={2.6} />
          </Pressable>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>{translate(locale, "paymentMethods")}</Text>
        <View style={styles.paymentEmpty}>
          <Text style={styles.paymentEmptyTitle}>To'lov kartalari yo'q</Text>
          <Text style={styles.paymentEmptyText}>Payment integratsiya ulangandan keyin kartalar shu yerda ko'rinadi.</Text>
          <Pressable onPress={showComingSoon} style={styles.addCard}>
            <Plus size={23} color="#6B7280" strokeWidth={2.7} />
            <Text style={styles.addCardText}>{translate(locale, "add")}</Text>
          </Pressable>
        </View>

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
                  placeholder="Ism Familiya"
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
          <SettingRow icon={Shield} iconColor="#2CD8A5" iconBg="#E9FFF7" title={translate(locale, "security")} />
          <SettingRow icon={WalletCards} iconColor="#F59E0B" iconBg="#FFF4E0" title={translate(locale, "paymentMethods")} />
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
          <SettingRow icon={CircleHelp} iconColor="#6B7280" iconBg="#F1F5F9" title={translate(locale, "help")} />
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
    </View>
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
          <Text style={styles.addressEmptyText}>Xaritadan nuqta tanlab, birinchi manzilingizni qo'shing.</Text>
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
                  <Text style={styles.defaultBadgeText}>Default</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.addressText} numberOfLines={2}>
              {address.addressText || address.address}
            </Text>
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
                  <Text style={[styles.addressTextButtonLabel, styles.addressDefaultText]}>Default</Text>
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
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.modalTitle}>{mode === "edit" ? "Manzilni tahrirlash" : "Yangi manzil"}</Text>
          <TextInput
            value={draft.title}
            onChangeText={(title) => onChange((current) => ({ ...current, title }))}
            placeholder="Nom: Uy, Ish, Ofis"
            placeholderTextColor="#A0A7B3"
            style={styles.modalInput}
          />
          <TextInput
            multiline
            value={draft.address}
            onChangeText={(address) => onChange((current) => ({ ...current, address }))}
            placeholder="Ko'cha, uy, mo'ljal"
            placeholderTextColor="#A0A7B3"
            style={[styles.modalInput, styles.modalTextarea]}
            textAlignVertical="top"
          />
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
            <Text style={[styles.defaultToggleText, draft.isDefault && styles.defaultToggleTextActive]}>Default manzil qilish</Text>
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
    minHeight: 142,
    paddingTop: 58,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13
  },
  logoIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
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
    fontSize: 30,
    lineHeight: 34,
    fontFamily: font.extra
  },
  logoAccent: {
    color: "#2CD8A5"
  },
  notificationButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F719D",
    shadowOpacity: 0.09,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 5
  },
  divider: {
    height: 1,
    marginHorizontal: 24,
    backgroundColor: "#DCECF3"
  },
  sectionTitle: {
    marginTop: 36,
    marginHorizontal: 24,
    color: "#273248",
    fontSize: 22,
    lineHeight: 27,
    fontFamily: font.extra
  },
  paymentRow: {
    marginTop: 20,
    paddingLeft: 24,
    paddingRight: 24,
    gap: 14
  },
  paymentEmpty: {
    marginTop: 20,
    marginHorizontal: 24,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EEF3",
    padding: 18,
    gap: 10
  },
  paymentEmptyTitle: {
    color: "#273248",
    fontSize: 17,
    fontFamily: font.extra
  },
  paymentEmptyText: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 19,
    fontFamily: font.semi
  },
  addCard: {
    width: 132,
    height: 88,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#C7D2DE",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  addCardText: {
    color: "#6B7280",
    fontSize: 15,
    fontFamily: font.bold
  },
  bankCard: {
    width: 168,
    height: 88,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5EEF3",
    backgroundColor: "#FFFFFF",
    padding: 17,
    justifyContent: "center",
    shadowColor: "#0F719D",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 3
  },
  bankTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  bankTitle: {
    fontSize: 16,
    fontFamily: font.extra
  },
  cardCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2CD8A5",
    alignItems: "center",
    justifyContent: "center"
  },
  cardCheckText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: font.extra
  },
  cardDigits: {
    marginTop: 10,
    color: "#273248",
    fontSize: 17,
    fontFamily: font.extra
  },
  settingsCard: {
    marginTop: 20,
    marginHorizontal: 24,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#0F719D",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 24,
    elevation: 5
  },
  settingRow: {
    minHeight: 82,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF3F7",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 15
  },
  settingRowPressed: {
    backgroundColor: "#F8FCFE"
  },
  settingIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center"
  },
  settingBody: {
    flex: 1
  },
  settingTop: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  settingTextWrap: {
    flex: 1
  },
  settingTitle: {
    color: "#273248",
    fontSize: 20,
    lineHeight: 25,
    fontFamily: font.extra
  },
  settingSubtitle: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 15,
    fontFamily: font.medium
  },
  chevronOpen: {
    transform: [{ rotate: "90deg" }]
  },
  personalDetails: {
    marginTop: 4,
    gap: 8
  },
  detailText: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: font.semi
  },
  profileInput: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCECF3",
    backgroundColor: "#F8FCFE",
    paddingHorizontal: 12,
    color: "#273248",
    fontSize: 15,
    fontFamily: font.semi
  },
  saveProfileButton: {
    alignSelf: "flex-start",
    minHeight: 38,
    borderRadius: 14,
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
    minHeight: 76,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 15
  },
  logoutIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FEECEC",
    alignItems: "center",
    justifyContent: "center"
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 20,
    fontFamily: font.extra
  },
  addressManager: {
    marginTop: 8,
    gap: 10
  },
  addAddressButton: {
    alignSelf: "flex-start",
    minHeight: 42,
    borderRadius: 15,
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
    minHeight: 72,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E5EEF3",
    backgroundColor: "#F8FCFE",
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 11
  },
  addressPin: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    fontSize: 15,
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
    fontSize: 12,
    lineHeight: 17,
    fontFamily: font.semi
  },
  addressDistrict: {
    marginTop: 4,
    color: "#0F80B7",
    fontSize: 11,
    fontFamily: font.extra
  },
  addressActionsRow: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  addressTextButton: {
    minHeight: 30,
    borderRadius: 11,
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
    width: 34,
    height: 34,
    borderRadius: 12,
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
    marginBottom: 26,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 18,
    gap: 12
  },
  modalTitle: {
    color: "#273248",
    fontSize: 21,
    fontFamily: font.extra
  },
  modalInput: {
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#DCECF3",
    backgroundColor: "#F8FCFE",
    paddingHorizontal: 13,
    color: "#273248",
    fontSize: 15,
    fontFamily: font.semi
  },
  modalTextarea: {
    minHeight: 86,
    paddingTop: 13
  },
  coordinateBox: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#DCECF3",
    backgroundColor: "#F8FCFE",
    paddingHorizontal: 13,
    paddingVertical: 11
  },
  coordinateLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontFamily: font.semi
  },
  coordinateText: {
    marginTop: 4,
    color: "#273248",
    fontSize: 15,
    fontFamily: font.extra
  },
  pickLocationButton: {
    minHeight: 44,
    borderRadius: 15,
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
    minHeight: 44,
    borderRadius: 15,
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
    minHeight: 48,
    borderRadius: 15,
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
    minHeight: 48,
    borderRadius: 15,
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
