import { StyleSheet } from "react-native";
import { moderateScale, wp } from "../utils/responsive";

export const AVATAR_SIZE = moderateScale(84);
export const RING_SIZE = AVATAR_SIZE + 12;

// Single shared stylesheet used by (admin)/profile.tsx, (employee)/profile.tsx,
// and every component under components/profile/*.
// Keep this file role-agnostic: styles that only make sense for one role
// (team list, connection banner) still live here so both screens import
// from one place, but are grouped clearly below.
export const profileStyles = StyleSheet.create({
  // ── Layout ────────────────────────────────────────────────────────────
  safeArea: { flex: 1 },
  scrollContent: { padding: wp(5.3), paddingBottom: 40 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },

  // ── Card shell ────────────────────────────────────────────────────────
  card: { borderRadius: 18, borderWidth: 2, padding: 18, marginBottom: 16 },
  cardTopRow: { flexDirection: "row", justifyContent: "flex-end" },
  editPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },

  // ── Avatar ────────────────────────────────────────────────────────────
  avatarSection: { alignItems: "center", marginTop: 4, marginBottom: 18 },
  avatarWrap: { position: "relative", width: RING_SIZE, height: RING_SIZE },
  avatarRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  cameraBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: moderateScale(26),
    height: moderateScale(26),
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarNameInput: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 180,
    textAlign: "center",
  },
  avatarDesignationInput: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 12,
    minWidth: 160,
    textAlign: "center",
  },

  // ── Field rows (email / contact / department / etc.) ────────────────────
  fieldsGroup: { marginTop: 4 },
  fieldRow: { borderBottomWidth: 1, paddingVertical: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 4,
  },

  // ── Appearance / theme picker ────────────────────────────────────────────
  themeRow: { flexDirection: "row", gap: 10 },
  themeOption: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
  },

  // ── Logout / delete ──────────────────────────────────────────────────────
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 4,
    borderRadius: 14,
  },
  deleteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C53030",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
  },

  // ── Fullscreen avatar preview modal ──────────────────────────────────────
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeModalButton: { position: "absolute", top: 50, right: 20, zIndex: 10 },
  fullscreenImage: { width: "90%", height: "70%" },

  // ── Team popup modal ─────────────────────────────────────────────────────
  teamModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: wp(6),
  },
  teamModalCard: {
    width: "90%",
    maxHeight: "70%",
    borderRadius: 18,
    borderWidth: 2,
    padding: 18,
  },
  teamModalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  teamModalCloseButton: {
    width: moderateScale(26),
    height: moderateScale(26),
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  employeeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  employeeCard: {
    width: "48%",
    aspectRatio: 0.95,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    marginBottom: 14,
  },
  employeeAvatar: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
  },
  employeeAvatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  employeeName: {
    marginTop: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  employeeDesignation: {
    marginTop: 4,
    textAlign: "center",
  },

  // ── Employee-only: connection banner + change admin ──────────────────────
  connectionBanner: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
  },
  connectionBannerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  requestAdminButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  changeAdminRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  changeAdminRowDisabled: {
    opacity: 0.5,
  },
  changeAdminLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
});