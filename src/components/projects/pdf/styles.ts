
import { StyleSheet } from '@react-pdf/renderer';

export const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    width: 120,
    height: 40,
    objectFit: 'contain',
  },
  headerDate: {
    fontSize: 9,
    color: '#6b7280',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#111827',
  },
  section: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#4b5563',
  },
  text: {
    fontSize: 10,
    marginBottom: 4,
    color: '#4b5563',
    lineHeight: 1.4,
  },
  label: {
    fontWeight: 'bold',
    color: '#374151',
  },
  stageTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1f2937',
  },
  photosGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 8,
  },
  photoGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 8,
  },
  photo: {
    width: 100,
    height: 75,
    marginBottom: 5,
    borderRadius: 2,
  },
  photoWrapper: {
    margin: 3,
    borderRadius: 3,
  },
  stageContainer: {
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    border: '1px solid #e5e7eb',
    breakInside: 'avoid',
  },
  statusBadge: {
    padding: '2 4',
    borderRadius: 2,
    fontSize: 8,
    color: '#ffffff',
    width: 'auto',
    marginBottom: 4,
  },
  photosContainer: {
    marginTop: 10,
  },
  stageItem: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    border: '1px solid #e5e7eb',
  },
  stageName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  stageStatus: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
});
