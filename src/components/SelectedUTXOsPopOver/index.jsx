import {useAppRoutes} from 'src/hooks/useAppRoutes';
import DokPopover from 'components/DokPopover';
import {useRouter} from 'next/navigation';
import {useCallback, useRef} from 'react';
import s from './SelectedUTXOsPopOver.module.css';

const SelectedUTXOsPopOver = () => {
  const router = useRouter();
  const routes = useAppRoutes();
  const popoverRef = useRef(null);

  const onSelectUTXOs = useCallback(() => {
    popoverRef.current?.close();
    router.push(routes.coin.selectUtxos());
  }, [router, routes]);

  return (
    <>
      <DokPopover ref={popoverRef}>
        <button className={s.popoverItemView} onClick={onSelectUTXOs}>
          <p className={s.popoverItemText}>{'Select UTXOs'}</p>
        </button>
      </DokPopover>
    </>
  );
};

export default SelectedUTXOsPopOver;
