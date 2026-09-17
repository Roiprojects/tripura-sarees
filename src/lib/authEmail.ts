import { site } from "@/config/site";

/**
 * True for the synthetic emails created for phone-OTP logins
 * (`phone_<digits>@<site.auth.phoneEmailDomain>`), which must never be shown
 * to customers or prefilled as their contact email.
 */
export const isPhonePlaceholderEmail = (email?: string | null) =>
  !!email &&
  (email.toLowerCase().endsWith(`@${site.auth.phoneEmailDomain.toLowerCase()}`) || /^phone_/i.test(email));
