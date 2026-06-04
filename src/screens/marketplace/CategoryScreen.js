import React, { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  ArrowLeft,
  ArrowUpNarrowWide,
  BriefcaseBusiness,
  ClipboardList,
  Home,
  MapPin,
  MessageCircle,
  Mic,
  Search,
  SlidersHorizontal,
  Star,
  UserRound,
  Wrench
} from "lucide-react-native";
import { ROUTES } from "../../constants/routes";
import { WORKER_STATUS } from "../../constants/workerStatus";
import { CitySelector } from "../../components/catalog/CitySelector";
import { EmptyState } from "../../components/ui/EmptyState";
import { useClientStore } from "../../store/clientStore";
import { WorkerAvatar } from "../../components/ui/WorkerAvatar";

const font = {
  medium: "Inter_500Medium",
  semi: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extra: "Inter_800ExtraBold"
};

const titleByProfession = {
  Santexnik: "Santexnika",
  Elektrik: "Elektrik",
  Payvandchi: "Payvandchi",
  Usta: "Usta",
  Konditsioner: "Konditsioner",
  "Ta'mirlash": "Ta'mirlash",
  Tozalash: "Tozalash"
};

function statusRank(worker) {
  if (worker.availability === WORKER_STATUS.AVAILABLE) return 0;
  if (worker.availability === WORKER_STATUS.BUSY) return 2;
  return 3;
}

function hasProfession(worker, profession) {
  const selected = String(profession || "").toLowerCase();
  const workerProfessions = Array.isArray(worker.professions) ? worker.professions : [];

  return [worker.specialty, ...workerProfessions].some((item) => String(item || "").toLowerCase() === selected);
}

export function CategoryScreen({ navigation, route }) {
  const profession = route.params?.profession || "Santexnik";
  const workers = useClientStore((state) => state.workers);
  const selectedCityId = useClientStore((state) => state.selectedCityId);
  const setSelectedCity = useClientStore((state) => state.setSelectedCity);
  const catalogQuery = useClientStore((state) => state.catalogQuery);
  const setCatalogQuery = useClientStore((state) => state.setCatalogQuery);
  const selectWorker = useClientStore((state) => state.selectWorker);
  const syncCatalogFromApi = useClientStore((state) => state.syncCatalogFromApi);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setCatalogQuery("");
    syncCatalogFromApi(profession);
  }, [profession, selectedCityId, setCatalogQuery, syncCatalogFromApi]);

  const visibleWorkers = useMemo(() => {
    const cleanQuery = catalogQuery.trim().toLowerCase();

    return workers
      .filter((worker) => worker.cityId === selectedCityId)
      .filter((worker) => hasProfession(worker, profession))
      .filter((worker) => worker.availability === WORKER_STATUS.AVAILABLE)
      .filter((worker) => {
        if (!cleanQuery) return true;
        return `${worker.name} ${worker.specialty}`.toLowerCase().includes(cleanQuery);
      })
      .sort((a, b) => {
        const statusDiff = statusRank(a) - statusRank(b);
        if (statusDiff) return statusDiff;
        return Number(b.rating) - Number(a.rating);
      });
  }, [catalogQuery, profession, selectedCityId, workers]);

  function openWorker(workerId) {
    selectWorker(workerId);
    navigation.navigate(ROUTES.WORKER_PROFILE);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await syncCatalogFromApi(profession);
    setRefreshing(false);
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0F80B7" colors={["#0F80B7"]} />}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color="#273248" strokeWidth={2.7} />
          </Pressable>
          <View style={styles.titleGroup}>
            <View style={styles.titleIcon}>
              <Wrench size={15} color="#FFFFFF" strokeWidth={3} />
            </View>
            <Text style={styles.title}>{titleByProfession[profession] || profession}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.citySelectorWrap}>
          <CitySelector selectedCityId={selectedCityId} onSelectCity={setSelectedCity} />
        </View>

        <View style={styles.searchBox}>
          <Search size={23} color="#0F80B7" strokeWidth={2.8} />
          <Text style={styles.searchText}>{profession} qidirish...</Text>
          <View style={styles.micButton}>
            <Mic size={19} color="#0F80B7" strokeWidth={2.8} />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <FilterChip active icon={SlidersHorizontal} label="Barchasi" />
          <FilterChip icon={Star} label="Reyting" />
          <FilterChip icon={BriefcaseBusiness} label="Narx" />
        </ScrollView>

        <View style={styles.list}>
          {visibleWorkers.length ? (
            visibleWorkers.map((worker, index) => (
              <WorkerListCard key={worker.id} worker={worker} index={index} onPress={() => openWorker(worker.id)} />
            ))
          ) : (
            <EmptyState title="Ustalar topilmadi" text="Bu kategoriya bo'yicha tasdiqlangan ustalar chiqqanda shu yerda ko'rinadi." />
          )}
        </View>
      </ScrollView>

      <Pressable style={styles.sortFab}>
        <ArrowUpNarrowWide size={29} color="#FFFFFF" strokeWidth={3} />
      </Pressable>
      <ScreenBottomNav navigation={navigation} />
    </View>
  );
}

function FilterChip({ active = false, icon: Icon, label }) {
  return (
    <View style={[styles.filterChip, active && styles.filterChipActive]}>
      <Icon size={15} color={active ? "#FFFFFF" : "#4B5563"} strokeWidth={2.7} />
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </View>
  );
}

function WorkerListCard({ worker, index, onPress }) {
  const topWorker = Number(worker.rating) >= 4.85 || index === 0;
  const price = worker.basePriceValue
    ? `${Number(worker.basePriceValue).toLocaleString("uz-UZ")} so'm`
    : worker.price;

  return (
    <Pressable onPress={onPress} style={styles.workerCard}>
      {topWorker ? (
        <View style={styles.topBadge}>
          <Text style={styles.topBadgeText}>TOP USTA</Text>
        </View>
      ) : null}
      <WorkerAvatar worker={worker} size={68} radius={16} style={styles.workerImage} />
      <View style={styles.workerInfo}>
        <Text style={styles.workerName}>{worker.name}</Text>
        <Text style={styles.experience}>Tajriba: {worker.experience || "Ko'rsatilmagan"}</Text>
        <View style={styles.ratingRow}>
          {[0, 1, 2, 3, 4].map((starIndex) => (
            <Star
              key={starIndex}
              size={15}
              color={starIndex < Math.round(Number(worker.rating || 4.8)) ? "#2CD8A5" : "#CBD5E1"}
              fill={starIndex < Math.round(Number(worker.rating || 4.8)) ? "#2CD8A5" : "transparent"}
              strokeWidth={2.3}
            />
          ))}
          <Text style={styles.ratingValue}>{worker.rating}</Text>
          <Text style={styles.reviewCount}>({worker.reviews || worker.completedOrders})</Text>
        </View>
        <View style={styles.workerBottom}>
          <View style={styles.distanceRow}>
            <MapPin size={15} color="#0F80B7" fill="#0F80B7" strokeWidth={2.5} />
            <Text style={styles.distanceText}>{worker.district || "Toshkent"}</Text>
          </View>
          <Text style={styles.priceText}>{price} <Text style={styles.priceMuted}>/dan</Text></Text>
        </View>
      </View>
    </Pressable>
  );
}

function ScreenBottomNav({ navigation }) {
  function goTab(screen) {
    navigation.navigate(ROUTES.CLIENT_TABS, { screen });
  }

  return (
    <View style={styles.bottomNav}>
      <Pressable style={styles.navItem} onPress={() => goTab(ROUTES.HOME_TAB)}>
        <Home size={25} color="#0F80B7" fill="#0F80B7" />
        <Text style={[styles.navLabel, styles.navLabelActive]}>Uy</Text>
      </Pressable>
      <Pressable style={styles.navItem} onPress={() => goTab(ROUTES.ORDERS_TAB)}>
        <ClipboardList size={25} color="#A0A7B3" />
        <Text style={styles.navLabel}>Buyurtmalar</Text>
      </Pressable>
      <Pressable style={styles.navItem} onPress={() => goTab(ROUTES.CHATS_TAB)}>
        <View>
          <MessageCircle size={25} color="#A0A7B3" />
        </View>
        <Text style={styles.navLabel}>Chatlar</Text>
      </Pressable>
      <Pressable style={styles.navItem} onPress={() => goTab(ROUTES.PROFILE_TAB)}>
        <UserRound size={25} color="#A0A7B3" />
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
  content: {
    paddingTop: 34,
    paddingBottom: 98,
    backgroundColor: "#F0F9FB"
  },
  header: {
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F719D",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 15,
    elevation: 4
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  titleIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1597A9",
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    color: "#273248",
    fontSize: 23,
    fontFamily: font.extra
  },
  headerSpacer: {
    width: 46
  },
  citySelectorWrap: {
    marginTop: 18,
    paddingHorizontal: 24
  },
  searchBox: {
    marginTop: 18,
    marginHorizontal: 24,
    height: 56,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCECF3",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 18,
    paddingRight: 12,
    shadowColor: "#0F719D",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 20,
    elevation: 5
  },
  searchText: {
    flex: 1,
    marginLeft: 14,
    color: "#A3ABB8",
    fontSize: 18,
    fontFamily: font.bold
  },
  micButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EEF7FD",
    alignItems: "center",
    justifyContent: "center"
  },
  filterRow: {
    marginTop: 30,
    paddingLeft: 24,
    paddingRight: 24,
    gap: 10
  },
  filterChip: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EEF3",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#0F719D",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 13,
    elevation: 3
  },
  filterChipActive: {
    backgroundColor: "#1699A9",
    borderColor: "#1699A9",
    shadowColor: "#2CD8A5",
    shadowOpacity: 0.25
  },
  filterText: {
    color: "#4B5563",
    fontSize: 16,
    fontFamily: font.extra
  },
  filterTextActive: {
    color: "#FFFFFF"
  },
  list: {
    paddingHorizontal: 24,
    paddingTop: 30,
    gap: 20
  },
  workerCard: {
    minHeight: 132,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    padding: 16,
    flexDirection: "row",
    gap: 16,
    shadowColor: "#0F719D",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 24,
    elevation: 5
  },
  topBadge: {
    position: "absolute",
    right: 16,
    top: -11,
    height: 31,
    borderRadius: 13,
    backgroundColor: "#1597A9",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 17,
    shadowColor: "#2CD8A5",
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 15,
    elevation: 5
  },
  topBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: font.extra
  },
  workerImage: {
    width: 68,
    height: 68,
    borderRadius: 16,
    backgroundColor: "#E5EEF3"
  },
  workerInfo: {
    flex: 1
  },
  workerName: {
    color: "#273248",
    fontSize: 20,
    lineHeight: 25,
    fontFamily: font.extra
  },
  experience: {
    marginTop: 6,
    color: "#6B7280",
    fontSize: 15,
    fontFamily: font.semi
  },
  ratingRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  ratingValue: {
    marginLeft: 6,
    color: "#273248",
    fontSize: 16,
    fontFamily: font.extra
  },
  reviewCount: {
    color: "#A3ABB8",
    fontSize: 14,
    fontFamily: font.medium
  },
  workerBottom: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  distanceText: {
    color: "#6B7280",
    fontSize: 14,
    fontFamily: font.semi
  },
  priceText: {
    color: "#0F80B7",
    fontSize: 16,
    fontFamily: font.extra
  },
  priceMuted: {
    color: "#A3ABB8",
    fontSize: 13,
    fontFamily: font.medium
  },
  sortFab: {
    position: "absolute",
    right: 24,
    bottom: 96,
    width: 58,
    height: 58,
    borderRadius: 21,
    backgroundColor: "#2CD8A5",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2CD8A5",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 18,
    elevation: 8
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
