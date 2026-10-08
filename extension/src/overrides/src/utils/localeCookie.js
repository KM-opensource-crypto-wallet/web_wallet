// Extension `utils/localeCookie`: there is no cookie; see utils/updateLocale.
import {readStoredLocale} from '@ext/app/i18n';

export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

export const hasLocaleCookie = () => readStoredLocale() != null;
