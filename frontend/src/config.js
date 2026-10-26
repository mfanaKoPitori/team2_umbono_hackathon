export const API_URL =
  'https://36ezljv7si.execute-api.af-south-1.amazonaws.com/prod/reports'

// Status changes are saved through the submit-report Lambda's 'update_status'
// action. Set to false to keep them in this browser only (e.g. offline demos).
export const STATUS_API_ENABLED = true
