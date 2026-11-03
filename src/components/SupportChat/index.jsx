'use client';
import React, {
  useCallback,
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
} from 'react';
import {useSelector} from 'react-redux';
import {useParams, usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import Dialog from '@mui/material/Dialog';
import Paper from '@mui/material/Paper';
import useMediaQuery from '@mui/material/useMediaQuery';
import {getIsVaultUnlocked} from 'dok-wallet-blockchain-networks/redux/auth/authSelectors';
import {chatReducer, initialState} from './chatState';
import {getStarters, mapResponse, send} from './supportChatApi';
import {findSecret} from './secretDetector';
import {getRoutePattern} from './policy';
import ChatBody from './ChatBody';
import {LinkHostsContext, NavigateContext} from './ChatParts';
import {useLauncherAttention} from './useLauncherAttention';
import styles from './SupportChat.module.css';

const STILL_WORKING_MS = 8000;
const ABORT_MS = 25000;

const asChips = list =>
  Array.isArray(list)
    ? list
        .filter(
          item =>
            item &&
            typeof item.id === 'string' &&
            typeof item.title === 'string',
        )
        .map(({id, title}) => ({id, title}))
    : [];

const SupportChat = ({hidden = false}) => {
  const t = useTranslations('supportChat');
  const unlocked = useSelector(getIsVaultUnlocked);
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const isMobile = useMediaQuery('(max-width:599.95px)');
  const prevUnlocked = useRef(unlocked);
  const launcherRef = useRef(null);
  const titleId = useId();
  const pathname = usePathname();
  const params = useParams();

  const visible = !hidden && !state.disabled;
  // A hidden route closes the panel but keeps the conversation.
  if (hidden && open) setOpen(false);
  const panelOpen = open && visible;
  const [hasOpened, setHasOpened] = useState(false);
  const {bounce, teaser, dismissTeaser} = useLauncherAttention(
    visible && !panelOpen && !hasOpened,
  );

  // Lock: wipe the conversation (previous-value ref, as in AppRouting).
  useEffect(() => {
    if (prevUnlocked.current && !unlocked) {
      (() => {
        dispatch({type: 'reset'});
        setOpen(false);
        setInput('');
      })();
    }
    prevUnlocked.current = unlocked;
  }, [unlocked]);

  // Starters: GET on the first open, cached in the reducer.
  useEffect(() => {
    if (!state.startersLoading) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      dispatch({type: 'startersError', code: 'timeout'});
    }, ABORT_MS);
    getStarters(controller.signal, state.startersRequestPath).then(res => {
      if (res.aborted) return;
      clearTimeout(timer);
      const result = mapResponse({...res, kind: 'starters'});
      if (result === 'ok') {
        dispatch({
          type: 'starters',
          starters: asChips(res.body.starters),
          linkHosts: Array.isArray(res.body.linkHosts)
            ? res.body.linkHosts.filter(h => typeof h === 'string')
            : [],
        });
      } else if (result === 'hide') {
        dispatch({type: 'disabled'});
      } else {
        dispatch({type: 'startersError', code: result});
      }
    });
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [state.startersLoading, state.startersRequestPath]);

  // One request at a time; reset, lock and unmount all end it via cleanup.
  const {pending} = state;
  useEffect(() => {
    if (!pending) return undefined;
    const {requestId} = pending;
    const controller = new AbortController();
    const slowTimer = setTimeout(
      () => dispatch({type: 'stillWorking', requestId}),
      STILL_WORKING_MS,
    );
    const abortTimer = setTimeout(() => {
      controller.abort();
      dispatch({type: 'timeout', requestId});
    }, ABORT_MS);
    const body =
      pending.type === 'chip'
        ? {v: 1, type: 'chip', entryId: pending.entryId}
        : {
            v: 1,
            type: 'text',
            message: pending.message,
            history: pending.history,
          };
    send(body, controller.signal).then(res => {
      if (res.aborted) return;
      clearTimeout(slowTimer);
      clearTimeout(abortTimer);
      const result = mapResponse({...res, kind: 'answer'});
      if (result === 'ok') {
        dispatch({
          type: 'answer',
          requestId,
          outcome: res.body.outcome,
          answer: typeof res.body.answer === 'string' ? res.body.answer : '',
          related: asChips(res.body.related),
        });
      } else if (result === 'hide') {
        dispatch({type: 'disabled'});
      } else {
        dispatch({type: 'error', requestId, code: result});
      }
    });
    return () => {
      clearTimeout(slowTimer);
      clearTimeout(abortTimer);
      controller.abort();
    };
  }, [pending]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setHasOpened(true);
    // Each open loads the starters for the current page, or retries a failed one.
    dispatch({type: 'startersStart', path: getRoutePattern(pathname, params)});
  }, [pathname, params]);

  // Navigating with the chat open and nothing asked yet: refresh the chips.
  const routePattern = getRoutePattern(pathname, params);
  const noMessages = state.messages.length === 0;
  useEffect(() => {
    if (panelOpen && noMessages) {
      dispatch({type: 'startersStart', path: routePattern});
    }
  }, [panelOpen, noMessages, routePattern]);

  const handleClose = useCallback(() => {
    setOpen(false);
    // Return focus to the launcher, as a modal dialog does.
    launcherRef.current?.focus();
  }, []);
  const handleNavigate = useCallback(() => {
    if (isMobile) setOpen(false);
  }, [isMobile]);
  const handlePanelKeyDown = useCallback(
    event => {
      if (event.key === 'Escape') handleClose();
    },
    [handleClose],
  );
  const handleToggle = useCallback(() => {
    if (panelOpen) setOpen(false);
    else handleOpen();
  }, [panelOpen, handleOpen]);

  const handleReset = useCallback(() => {
    dispatch({type: 'reset'});
    setInput('');
  }, []);

  const handlePick = useCallback(
    chip => dispatch({type: 'chip', id: chip.id, title: chip.title}),
    [],
  );

  const handleSubmit = useCallback(
    event => {
      event.preventDefault();
      const message = input.trim();
      if (!message || state.pending) return;
      setInput('');
      if (findSecret(message)) {
        dispatch({type: 'clientSecret'});
        return;
      }
      dispatch({type: 'send', text: message});
    },
    [input, state.pending],
  );

  if (!visible) return null;

  const body = (
    <LinkHostsContext.Provider value={state.linkHosts}>
      <NavigateContext.Provider value={handleNavigate}>
        <ChatBody
          state={state}
          input={input}
          onInput={setInput}
          onSubmit={handleSubmit}
          onPick={handlePick}
          onReset={handleReset}
          onClose={handleClose}
          titleId={titleId}
          autoFocus={!isMobile}
          t={t}
        />
      </NavigateContext.Provider>
    </LinkHostsContext.Provider>
  );

  return (
    <>
      {teaser && (
        <button type='button' className={styles.teaser} onClick={handleToggle}>
          {t('teaser')}
        </button>
      )}
      <button
        type='button'
        ref={launcherRef}
        aria-label={t('launcher')}
        aria-expanded={panelOpen}
        className={`${styles.launcher} ${bounce ? styles.bounce : ''}`}
        onClick={handleToggle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src='/images/support-chat-launcher.png' alt='' />
      </button>
      {isMobile ? (
        <Dialog
          fullScreen
          open={panelOpen}
          onClose={handleClose}
          sx={{zIndex: 1250}}
          slotProps={{
            paper: {
              sx: {
                backgroundColor: 'var(--secondaryBackgroundColor)',
                backgroundImage: 'none',
              },
            },
          }}
          aria-labelledby={titleId}>
          <div className={styles.dialogBody}>{body}</div>
        </Dialog>
      ) : panelOpen ? (
        <Paper
          className={styles.panel}
          role='dialog'
          aria-labelledby={titleId}
          elevation={8}
          sx={{
            backgroundColor: 'var(--secondaryBackgroundColor)',
            color: 'var(--font)',
            backgroundImage: 'none',
          }}
          onKeyDown={handlePanelKeyDown}>
          {body}
        </Paper>
      ) : null}
    </>
  );
};

export default SupportChat;
