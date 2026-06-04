import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ClipboardList,
  Clock3,
  Home,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  UserRound,
  X
} from "lucide-react-native";
import { ROUTES } from "../../constants/routes";
import { WORKER_STATUS } from "../../constants/workerStatus";
import { uploadMediaApi } from "../../services/media/mediaService";
import { useAuthStore } from "../../store/authStore";
import { useClientStore } from "../../store/clientStore";

const font = {
  medium: "Inter_500Medium",
  semi: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extra: "Inter_800ExtraBold"
};

const timeSlots = ["Bugun 14:00", "Bugun 16:00", "Bugun 18:00", "Ertaga 10:00", "Ertaga 14:00"];
const MAX_DESCRIPTION_LENGTH = 900;
const MAX_PHOTOS = 5;

function makeImageFile(asset) {
  const extension = asset.uri?.split(".").pop()?.split("?")[0] || "jpg";

  return {
    uri: asset.uri,
    name: `nearfix-order-${Date.now()}.${extension}`,
    mimeType: asset.mimeType || "image/jpeg"
  };
}

export function BookingScreen({ navigation, route }) {
  const session = useAuthStore((state) => state.session);
  const savedAddresses = useClientStore((state) => state.savedAddresses);
  const selectedWorkerId = useClientStore((state) => state.selectedWorkerId);
  const selectWorker = useClientStore((state) => state.selectWorker);
  const updateOrderDraft = useClientStore((state) => state.updateOrderDraft);
  const resetOrderDraft = useClientStore((state) => state.resetOrderDraft);
  const createOrderFromDraft = useClientStore((state) => state.createOrderFromDraft);
  const syncClientProfileFromApi = useClientStore((state) => state.syncClientProfileFromApi);
  const getSelectedWorker = useClientStore((state) => state.getSelectedWorker);
  const worker = getSelectedWorker();

  const [description, setDescription] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState(savedAddresses[0]?.id);
  const [selectedTime, setSelectedTime] = useState(timeSlots[0]);
  const [photos, setPhotos] = useState([]);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (route.params?.workerId && route.params.workerId !== selectedWorkerId) {
      selectWorker(route.params.workerId);
    }
  }, [route.params?.workerId, selectWorker, selectedWorkerId]);

  useEffect(() => {
    syncClientProfileFromApi();
  }, [syncClientProfileFromApi]);

  useEffect(() => {
    if (!selectedAddressId && savedAddresses[0]?.id) {
      setSelectedAddressId(savedAddresses[0].id);
    }
  }, [savedAddresses, selectedAddressId]);

  const selectedAddress = useMemo(
    () => savedAddresses.find((address) => address.id === selectedAddressId) || savedAddresses[0],
    [savedAddresses, selectedAddressId]
  );

  async function pickImages() {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert("Limit", `Ko'pi bilan ${MAX_PHOTOS} ta rasm qo'shish mumkin.`);
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Ruxsat kerak", "Buyurtmaga rasm qo'shish uchun galereyaga ruxsat bering.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsMultipleSelection: true,
        selectionLimit: MAX_PHOTOS - photos.length,
        quality: 0.65
      });

      if (result.canceled || !result.assets?.length) return;

      setPhotos((current) => [
        ...current,
        ...result.assets.slice(0, MAX_PHOTOS - current.length).map((asset) => ({
          id: `${asset.assetId || asset.uri}-${Date.now()}-${Math.random()}`,
          uri: asset.uri,
          file: makeImageFile(asset)
        }))
      ]);
    } catch (error) {
      Alert.alert("Rasm tanlanmadi", error?.message || "Galereyani ochishda xatolik yuz berdi.");
    }
  }

  function removePhoto(photoId) {
    setPhotos((current) => current.filter((photo) => photo.id !== photoId));
  }

  async function handleRefresh() {
    setRefreshing(true);
    await syncClientProfileFromApi();
    setRefreshing(false);
  }

  function validate() {
    const cleanDescription = description.trim();

    if (!selectedAddress) {
      Alert.alert("Manzil kerak", "Buyurtma uchun manzil tanlang.");
      return false;
    }

    if (!cleanDescription) {
      Alert.alert("Muammo haqida yozing", "Usta muammoni tushunishi uchun qisqa izoh kiriting.");
      return false;
    }

    if (cleanDescription.length > MAX_DESCRIPTION_LENGTH) {
      Alert.alert("Matn juda uzun", `Muammo tavsifi ${MAX_DESCRIPTION_LENGTH} belgidan oshmasin.`);
      return false;
    }

    if (!worker?.id) {
      Alert.alert("Usta tanlanmagan", "Buyurtma berish uchun usta tanlang.");
      return false;
    }

    if (worker.availability !== WORKER_STATUS.AVAILABLE) {
      Alert.alert("Usta hozir mavjud emas", "Iltimos, buyurtma uchun boshqa mavjud ustani tanlang.");
      return false;
    }

    return true;
  }

  async function handleSubmit() {
    if (submitting || !validate()) return;

    setSubmitting(true);

    try {
      const cleanDescription = description.trim();
      const problemTitle = `${worker?.specialty || "Xizmat"} buyurtmasi`;
      const descriptionWithTime = `${cleanDescription}\n\nVaqt: ${selectedTime}`;

      const backendAddressId = selectedAddress.addressText ? selectedAddress.id : undefined;

      updateOrderDraft({
        selectedWorkerId: worker.id,
        problemTitle,
        description: descriptionWithTime,
        addressId: backendAddressId,
        address: selectedAddress.addressText || selectedAddress.address,
        scheduledTime: selectedTime,
        photos
      });

      const result = await createOrderFromDraft();

      if (!result.ok) {
        throw new Error(result.message || "Buyurtma yaratilmadi");
      }

      if (session?.token && result.raw?.id && photos.length) {
        await Promise.all(
          photos.map((photo) =>
            uploadMediaApi(session.token, photo.file, {
              orderId: result.raw.id,
              scope: "ORDER_PROBLEM"
            })
          )
        );
      }

      resetOrderDraft({
        selectedWorkerId: worker.id,
        serviceId: worker.specialty,
        addressId: backendAddressId,
        address: selectedAddress.addressText || selectedAddress.address
      });

      Alert.alert("Buyurtma yuborildi", "Usta javobi kutilmoqda.", [
        {
          text: "Buyurtmalarga o'tish",
          onPress: () => navigation.navigate(ROUTES.CLIENT_TABS, { screen: ROUTES.ORDERS_TAB })
        }
      ]);
    } catch (error) {
      Alert.alert("Buyurtma yuborilmadi", error?.message || "Internet yoki server holatini tekshirib qayta urinib ko'ring.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={22} color="#273248" strokeWidth={2.7} />
        </Pressable>
        <Text style={styles.headerTitle}>Bron qilish</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0F80B7" colors={["#0F80B7"]} />}
      >
        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Manzilni tanlang</Text>
            <Pressable onPress={() => setAddressModalOpen(true)}>
              <Text style={styles.addText}>Tanlash</Text>
            </Pressable>
          </View>
          <Pressable style={styles.addressBox} onPress={() => setAddressModalOpen(true)}>
            <View style={styles.addressIcon}>
              <MapPin size={22} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2.6} />
            </View>
            <View style={styles.addressTextWrap}>
              <Text style={styles.addressTitle}>{selectedAddress?.label || "Manzil"}</Text>
              <Text style={styles.addressText} numberOfLines={1}>
                {selectedAddress?.addressText || selectedAddress?.address || "Manzil tanlang"}
              </Text>
            </View>
            <ChevronRight size={22} color="#A3ABB8" strokeWidth={2.6} />
          </Pressable>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Muammo haqida</Text>
          <TextInput
            multiline
            value={description}
            onChangeText={(value) => setDescription(value.slice(0, MAX_DESCRIPTION_LENGTH))}
            placeholder="Muammoni batafsil tushuntiring..."
            placeholderTextColor="#A3ABB8"
            style={styles.problemInput}
            textAlignVertical="top"
          />
          <Text style={styles.counterText}>
            {description.length}/{MAX_DESCRIPTION_LENGTH}
          </Text>
          <Text style={styles.photoTitle}>Rasmlar (ixtiyoriy)</Text>
          <View style={styles.photoRow}>
            {photos.length < MAX_PHOTOS ? (
              <Pressable style={styles.addPhotoBox} onPress={pickImages}>
                <Plus size={25} color="#0F80B7" strokeWidth={2.7} />
                <Text style={styles.addPhotoText}>Qo'shish</Text>
              </Pressable>
            ) : null}
            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoPreview}>
                <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                <Pressable style={styles.removePhoto} onPress={() => removePhoto(photo.id)}>
                  <X size={13} color="#FFFFFF" strokeWidth={3} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.formCard, styles.timeCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Vaqtni tanlang</Text>
            <Pressable onPress={() => setTimeModalOpen(true)}>
              <Text style={styles.addText}>O'zgartirish</Text>
            </Pressable>
          </View>
          <Pressable style={styles.timeBox} onPress={() => setTimeModalOpen(true)}>
            <View style={styles.timeIcon}>
              <Clock3 size={21} color="#0F80B7" strokeWidth={2.7} />
            </View>
            <Text style={styles.timeText}>{selectedTime}</Text>
            <ChevronRight size={22} color="#A3ABB8" strokeWidth={2.6} />
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.ctaBar}>
        <Pressable style={styles.phoneButton} onPress={() => Alert.alert("Qo'ng'iroq", "Telefon orqali aloqa keyingi etapda ulanadi.")}>
          <Phone size={23} color="#0F80B7" fill="#0F80B7" strokeWidth={2.7} />
        </Pressable>
        <Pressable style={[styles.confirmButton, submitting && styles.confirmButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmText}>Buyurtmani tasdiqlash</Text>}
        </Pressable>
      </View>

      <AddressModal
        visible={addressModalOpen}
        addresses={savedAddresses}
        selectedAddressId={selectedAddress?.id}
        onClose={() => setAddressModalOpen(false)}
        onSelect={(address) => {
          setSelectedAddressId(address.id);
          setAddressModalOpen(false);
        }}
      />
      <TimeModal
        visible={timeModalOpen}
        selectedTime={selectedTime}
        onClose={() => setTimeModalOpen(false)}
        onSelect={(time) => {
          setSelectedTime(time);
          setTimeModalOpen(false);
        }}
      />

      <ScreenBottomNav navigation={navigation} />
    </View>
  );
}

function AddressModal({ visible, addresses, selectedAddressId, onClose, onSelect }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.modalTitle}>Manzil tanlang</Text>
          {!addresses.length ? (
            <View style={styles.modalEmpty}>
              <Text style={styles.modalEmptyTitle}>Manzillar yo'q</Text>
              <Text style={styles.modalEmptyText}>Profilingizda manzil qo'shilgandan keyin buyurtmaga ulash mumkin bo'ladi.</Text>
            </View>
          ) : null}
          {addresses.map((address) => {
            const active = selectedAddressId === address.id;

            return (
              <Pressable key={address.id} style={[styles.optionRow, active && styles.optionRowActive]} onPress={() => onSelect(address)}>
                <View style={styles.optionIcon}>
                  <MapPin size={19} color="#0F80B7" strokeWidth={2.6} />
                </View>
                <View style={styles.optionBody}>
                  <Text style={styles.optionTitle}>{address.label || "Manzil"}</Text>
                  <Text style={styles.optionText} numberOfLines={2}>
                    {address.addressText || address.address}
                  </Text>
                </View>
                {active ? <Check size={22} color="#2CD8A5" strokeWidth={3} /> : null}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TimeModal({ visible, selectedTime, onClose, onSelect }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.modalTitle}>Vaqtni tanlang</Text>
          {timeSlots.map((time) => {
            const active = selectedTime === time;

            return (
              <Pressable key={time} style={[styles.optionRow, active && styles.optionRowActive]} onPress={() => onSelect(time)}>
                <View style={styles.optionIcon}>
                  <Clock3 size={19} color="#0F80B7" strokeWidth={2.6} />
                </View>
                <View style={styles.optionBody}>
                  <Text style={styles.optionTitle}>{time}</Text>
                  <Text style={styles.optionText}>Usta tasdiqlagandan keyin aniqlashtiriladi</Text>
                </View>
                {active ? <Check size={22} color="#2CD8A5" strokeWidth={3} /> : null}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ScreenBottomNav({ navigation }) {
  function goTab(screen) {
    navigation.navigate(ROUTES.CLIENT_TABS, { screen });
  }

  return (
    <View style={styles.bottomNav}>
      <Pressable style={styles.navItem} onPress={() => goTab(ROUTES.HOME_TAB)}>
        <Home size={24} color="#0F80B7" fill="#0F80B7" />
        <Text style={[styles.navLabel, styles.navLabelActive]}>Uy</Text>
      </Pressable>
      <Pressable style={styles.navItem} onPress={() => goTab(ROUTES.ORDERS_TAB)}>
        <ClipboardList size={24} color="#A0A7B3" />
        <Text style={styles.navLabel}>Buyurtmalar</Text>
      </Pressable>
      <Pressable style={styles.navItem} onPress={() => goTab(ROUTES.CHATS_TAB)}>
        <View>
          <MessageCircle size={24} color="#A0A7B3" />
        </View>
        <Text style={styles.navLabel}>Chatlar</Text>
      </Pressable>
      <Pressable style={styles.navItem} onPress={() => goTab(ROUTES.PROFILE_TAB)}>
        <UserRound size={24} color="#A0A7B3" />
        <Text style={styles.navLabel}>Profil</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F0F9FB"
  },
  header: {
    height: 112,
    paddingTop: 30,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  backButton: {
    width: 43,
    height: 43,
    borderRadius: 21.5,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F719D",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 15,
    elevation: 4
  },
  headerTitle: {
    color: "#273248",
    fontSize: 23,
    fontFamily: font.extra
  },
  headerSpacer: {
    width: 43
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 196,
    gap: 20
  },
  formCard: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 20,
    shadowColor: "#0F719D",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 24,
    elevation: 6
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 19
  },
  cardTitle: {
    color: "#273248",
    fontSize: 21,
    fontFamily: font.extra
  },
  addText: {
    color: "#2CD8A5",
    fontSize: 15,
    fontFamily: font.extra
  },
  addressBox: {
    minHeight: 74,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#CFE8F0",
    backgroundColor: "#EEF9FC",
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  addressIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1597A9",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1597A9",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 14,
    elevation: 5
  },
  addressTextWrap: {
    flex: 1
  },
  addressTitle: {
    color: "#273248",
    fontSize: 19,
    fontFamily: font.extra
  },
  addressText: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 15,
    fontFamily: font.medium
  },
  problemInput: {
    marginTop: 18,
    minHeight: 112,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D8E2EA",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
    paddingTop: 21,
    color: "#273248",
    fontSize: 17,
    fontFamily: font.medium
  },
  counterText: {
    marginTop: 8,
    color: "#A3ABB8",
    fontSize: 12,
    textAlign: "right",
    fontFamily: font.semi
  },
  photoTitle: {
    marginTop: 18,
    color: "#273248",
    fontSize: 18,
    fontFamily: font.extra
  },
  photoRow: {
    marginTop: 17,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15
  },
  addPhotoBox: {
    width: 78,
    height: 78,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#CFE8F0",
    backgroundColor: "#F0F9FB",
    alignItems: "center",
    justifyContent: "center",
    gap: 5
  },
  addPhotoText: {
    color: "#0F80B7",
    fontSize: 13,
    fontFamily: font.bold
  },
  photoPreview: {
    width: 78,
    height: 78,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  photoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  removePhoto: {
    position: "absolute",
    right: 6,
    top: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(45,55,72,0.70)",
    alignItems: "center",
    justifyContent: "center"
  },
  timeCard: {
    minHeight: 112
  },
  timeBox: {
    minHeight: 58,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#CFE8F0",
    backgroundColor: "#F8FCFE",
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 13
  },
  timeIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(44,216,165,0.18)",
    alignItems: "center",
    justifyContent: "center"
  },
  timeText: {
    flex: 1,
    color: "#273248",
    fontSize: 17,
    fontFamily: font.extra
  },
  ctaBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 82,
    height: 82,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopWidth: 1,
    borderTopColor: "#E5EEF3",
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 13
  },
  phoneButton: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F719D",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 4
  },
  confirmButton: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#2CD8A5",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2CD8A5",
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 18,
    elevation: 7
  },
  confirmButtonDisabled: {
    opacity: 0.68
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: font.extra
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
    gap: 10
  },
  modalTitle: {
    color: "#273248",
    fontSize: 21,
    fontFamily: font.extra,
    marginBottom: 4
  },
  modalEmpty: {
    borderRadius: 18,
    backgroundColor: "#F6F8FB",
    padding: 16
  },
  modalEmptyTitle: {
    color: "#273248",
    fontSize: 16,
    fontFamily: font.extra
  },
  modalEmptyText: {
    marginTop: 6,
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 19,
    fontFamily: font.medium
  },
  optionRow: {
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEF1F4",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  optionRowActive: {
    borderColor: "#2CD8A5",
    backgroundColor: "#F0FFF9"
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EAF8FC",
    alignItems: "center",
    justifyContent: "center"
  },
  optionBody: {
    flex: 1
  },
  optionTitle: {
    color: "#273248",
    fontSize: 16,
    fontFamily: font.extra
  },
  optionText: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: font.medium
  },
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 86,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    shadowColor: "#0F719D",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -10 },
    shadowRadius: 18,
    elevation: 10
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5
  },
  navLabel: {
    color: "#A0A7B3",
    fontSize: 14,
    fontFamily: font.bold
  },
  navLabelActive: {
    color: "#0F80B7"
  },
});
