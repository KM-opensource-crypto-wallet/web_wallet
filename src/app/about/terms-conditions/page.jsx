'use client';

import {useRouter} from 'next/navigation';
import AuthLayout, {BackBar, authStyles} from 'components/AuthLayout';
import s from './TermsConditionsPage.module.css';
import {getTermsUrl} from 'whitelabel/whiteLabelInfo';

const TermsConditionsPage = () => {
  const router = useRouter();

  return (
    <AuthLayout
      wide
      topBar={<BackBar title='About' onBack={() => router.back()} />}
      title='Terms of Use'>
      <div className={authStyles.form}>
        <div className={`${authStyles.card} ${s.card}`}>
          <iframe
            src={getTermsUrl()}
            title='Terms of Use'
            className={s.frame}
          />
        </div>
      </div>
    </AuthLayout>
  );
};

export default TermsConditionsPage;
