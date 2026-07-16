// This tab shows the eOffice file list directly (Excel/PDF report generation
// is admin-only and not needed here). Re-exporting the same component used
// at app/reports/eoffice/index.tsx keeps a single source of truth instead
// of duplicating the list/fetch logic.
export { default } from '../reports/eoffice/index';