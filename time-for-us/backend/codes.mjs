// Server-only registry. Add a SHA-256 entry to issue a code; set active:false to revoke it.
// Existing sessions check this registry on every protected request.
export const accessCodes = [
  { id: 'launch-test', hash: '6413db9f401696fd3769249cf5e3a65d09e6122cb0c05b572b5c61035841e046', active: true }
];
