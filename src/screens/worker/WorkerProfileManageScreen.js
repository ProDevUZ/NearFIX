import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { Bell, Camera, CheckCircle2, Clock3, LogOut, ShieldCheck, UserRound } from "lucide-react-native";
import { CITIES } from "../../constants/catalog";
import { ROUTES } from "../../constants/routes";
import { uploadMediaApi } from "../../services/media/mediaService";
import { fetchUnreadNotificationCountApi } from "../../services/notifications/notificationService";
import { useAuthStore } from "../../store/authStore";
import { useWorkerStore } from "../../store/workerStore";
import { colors, radius, shadow } from "../../theme";

const serviceOptions = ["Santexnik", "Elektrik", "Payvandchi", "Usta", "Konditsioner", "Ta'mirlash", "Tozalash"];

export function WorkerProfileManageScreen({ navigation }) {
  const token = useAuthStore((state) => state.session?.token);
  const logout = useAuthStore((state) => state.logout);
  const worker = useWorkerStore((state) => state.workerProfile);
  const syncWorkerFromApi = useWorkerStore((state) => state.syncWorkerFromApi);
  const submitWorkerProfile = useWorkerStore((state) => state.submitWorkerProfile);
  const [name, setName] = useState(worker?.name || "");
  const [experienceYears, setExperienceYears] = useState(String(worker?.experienceYears || ""));
  const [basePrice, setBasePrice] = useState(worker?.basePriceValue ? String(worker.basePriceValue) : "");
  const [bio, setBio] = useState(worker?.about || "");
  const [profileImageUrl, setProfileImageUrl] = useState(worker?.profileImageUrl || "");
  const [cityId, setCityId] = useState(worker?.cityId || "");
  const [selectedServices, setSelectedServices] = useState(worker?.professions || [worker?.specialty].filter(Boolean));
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const isApproved = worker?.status === "approved";

  useEffect(() => {
    syncWorkerFromApi();
  }, [syncWorkerFromApi]);

  const loadUnreadNotifications = useCallback(async () => {
    if (!token) {
      setUnreadNotifications(0);
      return;
    }

    const result = await fetchUnreadNotificationCountApi(token);
    if (result.ok) setUnreadNotifications(result.count);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadUnreadNotifications();
    }, [loadUnreadNotifications])
  );

  useEffect(() => {
    setName(worker?.name || "");
    setExperienceYears(String(worker?.experienceYears || ""));
    setBasePrice(worker?.basePriceValue ? String(worker.basePriceValue) : "");
    setBio(worker?.about || "");
    setProfileImageUrl(worker?.profileImageUrl || "");
    setCityId(worker?.cityId || "");
    setSelectedServices(worker?.professions || [worker?.specialty].filter(Boolean));
  }, [worker?.about, worker?.basePriceValue, worker?.cityId, worker?.experienceYears, worker?.name, worker?.profileImageUrl, worker?.professions, worker?.specialty]);

  const statusCopy = useMemo(() => {
    if (isApproved) {
      return {
        title: "Profil tasdiqlangan",
        text: "Siz katalogda ko'rinasiz va buyurtma qabul qilishingiz mumkin.",
        color: colors.success
      };
    }

    return {
      title: "Yangi - admin tasdig'i kutilmoqda",
      text: "Ma'lumotlarni to'ldiring. Admin ko'rib chiqqandan keyin siz haqiqiy ustalar ro'yxatiga qo'shilasiz.",
      color: "#F59E0B"
    };
  }, [isApproved]);

  function toggleService(service) {
    setSelectedServices((current) =>
      current.includes(service)
        ? current.filter((item) => item !== service)
        : [...current, service]
    );
  }

  async function handlePickImage() {
    if (!token) {
      Alert.alert("Tizimga kiring", "Rasm yuklash uchun qayta tizimga kiring.");
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Ruxsat kerak", "Profil rasmini tanlash uchun galereyaga ruxsat bering.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setUploadingImage(true);
      const uploadResult = await uploadMediaApi(token, {
        uri: asset.uri,
        name: asset.fileName || `worker-profile-${Date.now()}.jpg`,
        mimeType: asset.mimeType || "image/jpeg"
      }, { scope: "WORKER_GALLERY" });
      setUploadingImage(false);

      if (uploadResult.ok && uploadResult.media?.url) {
        setProfileImageUrl(uploadResult.media.url);
        return;
      }

      Alert.alert("Rasm yuklanmadi", "Qayta urinib ko'ring.");
    } catch (error) {
      setUploadingImage(false);
      Alert.alert("Rasm tanlanmadi", error?.message || "Galereyani ochishda xatolik yuz berdi.");
    }
  }

  async function handleSubmit() {
    if (isApproved) {
      Alert.alert("Profil tasdiqlangan", "Profilingiz admin tomonidan tasdiqlangan.");
      return;
    }

    if (!name.trim()) {
      Alert.alert("Ism familiya kerak", "Admin tekshiruvi uchun ismingizni kiriting.");
      return;
    }

    if (!selectedServices.length) {
      Alert.alert("Soha tanlang", "Kamida bitta xizmat sohasini tanlang.");
      return;
    }

    if (!cityId) {
      Alert.alert("Shahar tanlang", "Mijozlar sizni topishi uchun shaharni tanlang.");
      return;
    }

    if (!experienceYears.trim()) {
      Alert.alert("Tajriba kerak", "Ish tajribangizni yil ko'rinishida kiriting.");
      return;
    }

    if (!profileImageUrl.trim()) {
      Alert.alert("Profil rasmi kerak", "Admin tekshiruvi uchun profil rasmini yuklang.");
      return;
    }

    if (!basePrice.trim()) {
      Alert.alert("Narx kerak", "Boshlang'ich narxni kiriting.");
      return;
    }

    if (!bio.trim()) {
      Alert.alert("Bio kerak", "O'zingiz haqingizda qisqa ma'lumot kiriting.");
      return;
    }

    setSaving(true);
    const result = await submitWorkerProfile({
      name: name.trim(),
      cityId,
      professions: selectedServices,
      experienceYears: Number(experienceYears || 0),
      profileImageUrl: profileImageUrl.trim() || undefined,
      bio: bio.trim() || undefined,
      basePrice: Number(basePrice || 0) || undefined
    });
    setSaving(false);

    Alert.alert(
      result.ok ? "Yuborildi" : "Xatolik",
      result.ok
        ? "Profil ma'lumotlari admin tekshiruviga yuborildi."
        : "Profilni yuborishda xatolik yuz berdi."
    );
  }

  function handleLogout() {
    Alert.alert("Chiqish", "Usta profilidan chiqishni tasdiqlaysizmi?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "Chiqish",
        style: "destructive",
        onPress: () => logout()
      }
    ]);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await syncWorkerFromApi();
    setRefreshing(false);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0F80B7" colors={["#0F80B7"]} />}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.eyebrow}>Profil sozlamalari</Text>
            <Text style={styles.title}>Usta profili</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.iconButton} onPress={() => navigation.navigate(ROUTES.NOTIFICATIONS)}>
              <Bell size={21} color={colors.text} strokeWidth={2.7} />
              {unreadNotifications > 0 ? (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{unreadNotifications > 99 ? "99+" : unreadNotifications}</Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <LogOut size={22} color={colors.danger} strokeWidth={2.7} />
            </Pressable>
          </View>
        </View>
        <Text style={styles.subtitle}>Tasdiqdan oldin kerakli ma'lumotlarni to'ldiring</Text>
      </View>

      <View style={[styles.statusCard, { borderColor: statusCopy.color }]}>
        <Clock3 size={20} color={statusCopy.color} strokeWidth={2.7} />
        <View style={styles.flex}>
          <Text style={styles.statusTitle}>{statusCopy.title}</Text>
          <Text style={styles.statusText}>{statusCopy.text}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Shaxsiy ma'lumot</Text>
          <Text style={styles.cardMeta}>1/3</Text>
        </View>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            {profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} style={styles.avatarImage} />
            ) : (
              <UserRound size={30} color={colors.white} strokeWidth={2.6} />
            )}
          </View>
          <View style={styles.flex}>
            <Text style={styles.inputLabel}>Profil rasmi</Text>
            <Pressable onPress={handlePickImage} disabled={uploadingImage} style={[styles.uploadButton, uploadingImage && styles.submitButtonMuted]}>
              <Text style={styles.uploadText}>{uploadingImage ? "Yuklanmoqda..." : profileImageUrl ? "Rasmni almashtirish" : "Rasm yuklash"}</Text>
            </Pressable>
          </View>
          <Pressable onPress={handlePickImage} disabled={uploadingImage} style={styles.cameraButton}>
            <Camera size={20} color={colors.primary} strokeWidth={2.6} />
          </Pressable>
        </View>

        <Field label="Ism familiya" value={name} onChangeText={setName} placeholder="Masalan: Ism Familiya" />
        <Text style={styles.inputLabel}>Shahar</Text>
        <View style={styles.cityGrid}>
          {CITIES.map((city) => {
            const active = city.id === cityId;
            return (
              <Pressable key={city.id} onPress={() => setCityId(city.id)} style={[styles.cityChip, active && styles.cityChipActive]}>
                <Text style={[styles.cityChipText, active && styles.cityChipTextActive]}>{city.name}</Text>
              </Pressable>
            );
          })}
        </View>
        <Field label="Tajriba" value={experienceYears} onChangeText={setExperienceYears} placeholder="8" keyboardType="number-pad" />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Xizmat sohalari</Text>
          <Text style={styles.cardMeta}>2/3</Text>
        </View>
        <Text style={styles.helperText}>Bitta yoki bir nechta soha tanlash mumkin.</Text>
        <View style={styles.chips}>
          {serviceOptions.map((service) => {
            const active = selectedServices.includes(service);
            return (
              <Pressable key={service} onPress={() => toggleService(service)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{service}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Ish ma'lumotlari</Text>
          <Text style={styles.cardMeta}>3/3</Text>
        </View>
        <Field label="Boshlang'ich narx" value={basePrice} onChangeText={setBasePrice} placeholder="100000" keyboardType="number-pad" />
        <Text style={styles.inputLabel}>O'zingiz haqingizda</Text>
        <TextInput
          multiline
          value={bio}
          onChangeText={setBio}
          placeholder="Tajriba, ish uslubi va kafolat haqida qisqa yozing"
          placeholderTextColor={colors.subtle}
          style={[styles.input, styles.textArea]}
        />
      </View>

      <View style={styles.noteCard}>
        <ShieldCheck size={20} color={colors.primary} strokeWidth={2.6} />
        <Text style={styles.noteText}>
          {isApproved ? "Profilingiz tasdiqlangan. Endi mijozlar sizni katalogda ko'radi." : "Admin tasdiqlamaguncha profilingiz mijozlarga ko'rinmaydi."}
        </Text>
      </View>

      {isApproved ? null : (
        <Pressable onPress={handleSubmit} disabled={saving} style={[styles.submitButton, saving && styles.submitButtonMuted]}>
          <CheckCircle2 size={21} color={colors.white} strokeWidth={2.6} />
          <Text style={styles.submitText}>{saving ? "Yuborilmoqda..." : "Admin tekshiruviga yuborish"}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput placeholderTextColor={colors.subtle} style={styles.input} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 112,
    gap: 14,
    backgroundColor: colors.background
  },
  header: {
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    padding: 16,
    ...shadow
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  headerTitleBlock: {
    flex: 1
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontFamily: "Inter_800ExtraBold"
  },
  title: {
    marginTop: 4,
    color: colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontFamily: "Inter_800ExtraBold"
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  notificationBadge: {
    position: "absolute",
    top: -5,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5
  },
  notificationBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "900"
  },
  logoutButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center"
  },
  subtitle: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_600SemiBold"
  },
  statusCard: {
    borderWidth: 1,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    ...shadow
  },
  flex: {
    flex: 1
  },
  statusTitle: {
    color: colors.text,
    fontSize: 15,
    fontFamily: "Inter_800ExtraBold"
  },
  statusText: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_600SemiBold"
  },
  card: {
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    padding: 16,
    gap: 14,
    ...shadow
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontFamily: "Inter_800ExtraBold"
  },
  cardMeta: {
    color: colors.subtle,
    fontSize: 12,
    fontFamily: "Inter_800ExtraBold"
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: 12
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  avatarImage: {
    width: "100%",
    height: "100%"
  },
  uploadButton: {
    minHeight: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    justifyContent: "center"
  },
  uploadText: {
    color: colors.primary,
    fontSize: 14,
    fontFamily: "Inter_800ExtraBold"
  },
  cameraButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  field: {
    gap: 6
  },
  inputLabel: {
    color: colors.text,
    fontSize: 12,
    fontFamily: "Inter_800ExtraBold"
  },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold"
  },
  textArea: {
    minHeight: 96,
    paddingTop: 12,
    textAlignVertical: "top"
  },
  helperText: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold"
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  cityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  cityChip: {
    minHeight: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 9,
    justifyContent: "center"
  },
  cityChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary
  },
  cityChipText: {
    color: colors.muted,
    fontSize: 13,
    fontFamily: "Inter_800ExtraBold"
  },
  cityChipTextActive: {
    color: colors.white
  },
  chip: {
    minHeight: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 9,
    justifyContent: "center"
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary
  },
  chipText: {
    color: colors.muted,
    fontSize: 13,
    fontFamily: "Inter_800ExtraBold"
  },
  chipTextActive: {
    color: colors.white
  },
  noteCard: {
    borderRadius: radius.lg,
    backgroundColor: "#E6F4F8",
    padding: 13,
    flexDirection: "row",
    gap: 10,
    alignItems: "center"
  },
  noteText: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_700Bold"
  },
  submitButton: {
    minHeight: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8
  },
  submitButtonMuted: {
    opacity: 0.65
  },
  submitText: {
    color: colors.white,
    fontSize: 15,
    fontFamily: "Inter_800ExtraBold"
  }
});
