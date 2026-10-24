import policy from './privacy-policy.json' with {type:'json'};
import {PrivacyError} from './reauth.mjs';
export const HEALTH_CONSENT_VERSION=policy.version;
export const HEALTH_CONSENT_TEXT=policy.healthConsent;
export function healthConsentReceipt(value, subjectId, now=Date.now()) {
  if(value?.healthDataConsent!==true)throw new PrivacyError('É necessário consentir explicitamente com o tratamento dos dados sensíveis de saúde.');
  if(value.healthConsentVersion!==HEALTH_CONSENT_VERSION)throw new PrivacyError('O texto de consentimento mudou. Atualize a página e leia antes de enviar.',409);
  return {id:crypto.randomUUID(),subjectId,version:HEALTH_CONSENT_VERSION,text:HEALTH_CONSENT_TEXT,acceptedAt:new Date(now).toISOString()};
}
