import { StyleSheet, Platform } from "react-native";
import { wp, hp } from "../utils/responsive";

// Shared stylesheet for (admin)/tasks.tsx and (employee)/tasks.tsx and their
// sub-components under components/tasks/*.
export const taskListStyles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: wp(5.3),
    paddingTop: 12,
    paddingBottom: 8,
  },
  filterButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },

  // ── Search bar ────────────────────────────────────────────────────────
  searchRow: {
    paddingHorizontal: wp(5.3),
    paddingBottom: 14,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  searchBarFocused: {
    ...Platform.select({
      ios: { shadowOpacity: 0.12, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, padding: 0 },
  clearButton: { marginLeft: 8 },

  // ── Task list / cards ────────────────────────────────────────────────
  scrollContent: { paddingHorizontal: wp(5.3), paddingBottom: 32 },
  taskCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  taskCardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  statusBadge: { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  statusBadgeText: { color: "#FFFFFF" },

  // ── Filter modal ─────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    borderRadius: 18,
    padding: 20,
    maxHeight: hp(70),
    alignSelf: "center",
    width: "100%",
  },
  scrollArea: { flexGrow: 0 },
  sectionLabel: { marginTop: 14, marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  applyButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 14,
  },
});