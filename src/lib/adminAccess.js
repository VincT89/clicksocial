// Account autorizzato all'area azienda (back-office) di ClickSocial
export const ADMIN_EMAIL = "admin@sodanoconsulting.it";

export function isAdminAccount(me) {
  return me?.role === "admin";
}