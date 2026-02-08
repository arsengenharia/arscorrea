import { StyleSheet } from "@react-pdf/renderer";

export const contractStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#333",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    borderBottom: "2px solid #1e40af",
    paddingBottom: 15,
  },
  logo: {
    width: 120,
    height: 50,
    objectFit: "contain",
  },
  headerInfo: {
    textAlign: "right",
  },
  contractNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e40af",
  },
  date: {
    fontSize: 9,
    color: "#666",
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e40af",
    marginBottom: 10,
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: 5,
  },
  row: {
    flexDirection: "row",
    marginBottom: 5,
  },
  label: {
    width: 120,
    fontWeight: "bold",
    color: "#555",
  },
  value: {
    flex: 1,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    padding: 8,
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottom: "1px solid #e5e7eb",
  },
  colCategory: { width: "15%" },
  colDescription: { width: "35%" },
  colUnit: { width: "10%", textAlign: "center" },
  colQuantity: { width: "10%", textAlign: "right" },
  colUnitPrice: { width: "15%", textAlign: "right" },
  colTotal: { width: "15%", textAlign: "right" },
  totalsSection: {
    marginTop: 20,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 5,
  },
  totalLabel: {
    width: 100,
    textAlign: "right",
    marginRight: 20,
  },
  totalValue: {
    width: 100,
    textAlign: "right",
    fontWeight: "bold",
  },
  grandTotal: {
    fontSize: 14,
    color: "#1e40af",
    borderTop: "2px solid #1e40af",
    paddingTop: 10,
    marginTop: 10,
  },
  scopeText: {
    fontSize: 9,
    lineHeight: 1.6,
    textAlign: "justify",
  },
  paymentNotes: {
    fontSize: 9,
    lineHeight: 1.6,
    backgroundColor: "#f9fafb",
    padding: 10,
    marginTop: 10,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#999",
    borderTop: "1px solid #e5e7eb",
    paddingTop: 10,
  },
});
