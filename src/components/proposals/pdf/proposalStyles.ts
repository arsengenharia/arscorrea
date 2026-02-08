import { StyleSheet } from "@react-pdf/renderer";

export const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#1a365d",
  },
  logo: {
    width: 120,
    height: 40,
    objectFit: "contain",
  },
  headerInfo: {
    textAlign: "right",
  },
  proposalNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1a365d",
  },
  proposalDate: {
    fontSize: 9,
    color: "#666666",
    marginTop: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a365d",
    textAlign: "center",
    marginBottom: 5,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1a365d",
    backgroundColor: "#f0f4f8",
    padding: 6,
    marginBottom: 8,
  },
  infoBlock: {
    paddingHorizontal: 8,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 80,
    fontWeight: "bold",
    color: "#333333",
  },
  value: {
    flex: 1,
    color: "#444444",
  },
  paragraph: {
    color: "#444444",
    lineHeight: 1.5,
    textAlign: "justify",
  },
  blockLine: {
    marginBottom: 10,
  },
  blockTitle: {
    fontWeight: "bold",
    color: "#1a365d",
    marginBottom: 3,
  },
  table: {
    marginTop: 5,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1a365d",
    color: "#FFFFFF",
    fontWeight: "bold",
    paddingVertical: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 5,
  },
  th: {
    color: "#FFFFFF",
    fontSize: 8,
    paddingHorizontal: 4,
  },
  td: {
    fontSize: 8,
    paddingHorizontal: 4,
    color: "#333333",
  },
  colCat: {
    width: "15%",
  },
  colDesc: {
    width: "35%",
  },
  colUnit: {
    width: "8%",
    textAlign: "center",
  },
  colQty: {
    width: "10%",
    textAlign: "center",
  },
  colPrice: {
    width: "16%",
    textAlign: "right",
  },
  colTotal: {
    width: "16%",
    textAlign: "right",
  },
  totals: {
    marginTop: 10,
    alignItems: "flex-end",
    paddingRight: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 3,
  },
  totalLabel: {
    width: 100,
    textAlign: "right",
    paddingRight: 10,
    color: "#666666",
  },
  totalValue: {
    width: 80,
    textAlign: "right",
    color: "#333333",
  },
  totalRowStrong: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: "#1a365d",
  },
  totalLabelStrong: {
    width: 100,
    textAlign: "right",
    paddingRight: 10,
    fontWeight: "bold",
    color: "#1a365d",
    fontSize: 12,
  },
  totalValueStrong: {
    width: 80,
    textAlign: "right",
    fontWeight: "bold",
    color: "#1a365d",
    fontSize: 12,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#888888",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
  },
});
