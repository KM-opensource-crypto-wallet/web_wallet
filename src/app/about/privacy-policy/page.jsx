'use client';
import {useRouter} from 'next/navigation';
import AuthLayout, {BackBar, authStyles} from 'components/AuthLayout';
import s from './PrivacyPolicyPage.module.css';
import {getPrivacyUrl} from 'whitelabel/whiteLabelInfo';

const PrivacyPolicyPage = () => {
  const router = useRouter();

  return (
    <AuthLayout
      wide
      topBar={<BackBar title='About' onBack={() => router.back()} />}
      title='Privacy Policy'>
      <div className={authStyles.form}>
        <div className={`${authStyles.card} ${s.card}`}>
          <iframe
            src={getPrivacyUrl()}
            title='Privacy Policy'
            className={s.frame}
          />
        </div>
      </div>
    </AuthLayout>
  );
};

export default PrivacyPolicyPage;
