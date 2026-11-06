/** @jest-environment jsdom */
import React from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import useMediaQuery from '@mui/material/useMediaQuery';
import {useSelector} from 'react-redux';
import {useParams, usePathname} from 'next/navigation';
import {getStarters, send} from './supportChatApi';
import SupportChat from './index';

jest.mock('react-markdown', () => ({
  __esModule: true,
  // Renders plain text; `[label](href)` goes through the supplied link component.
  default: ({children, components}) => {
    const match = /^\[(.+)\]\((.+)\)$/.exec(children);
    const A = components?.a;
    return (
      <div>{match && A ? <A href={match[2]}>{match[1]}</A> : children}</div>
    );
  },
}));
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useParams: jest.fn(),
}));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({href, onClick, children}) => (
    <a
      href={href}
      onClick={e => {
        e.preventDefault();
        onClick?.(e);
      }}>
      {children}
    </a>
  ),
}));
jest.mock('next-intl', () => ({useTranslations: () => key => key}));
jest.mock('react-redux', () => ({useSelector: jest.fn()}));
jest.mock('@mui/material/useMediaQuery', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('whitelabel/whiteLabelInfo', () => ({
  DOK_WALLET_ID: 'dok-id',
  getAppIcon: () => '/brand-icon.png',
  getAppIconDark: () => '/brand-icon-dark.png',
  getAppTitle: () => 'Dok Wallet',
  getContactUsEmail: () => 'help@example.com',
  getWhiteLabelId: () => 'dok-id',
}));
jest.mock('./supportChatApi', () => ({
  ...jest.requireActual('./supportChatApi'),
  getStarters: jest.fn(),
  send: jest.fn(),
}));

const STARTERS = {
  status: 200,
  body: {
    v: 1,
    starters: [{id: 's1', title: 'How do I back up?'}],
    linkHosts: [],
  },
  tokenSent: false,
};
const answer = (text, extra = {}) => ({
  status: 200,
  body: {v: 1, outcome: 'answered', answer: text, related: [], ...extra},
  tokenSent: false,
});
const SEED = Array(11).fill('abandon').concat('about').join(' ');

const deferred = () => {
  let resolve;
  const promise = new Promise(r => {
    resolve = r;
  });
  return {promise, resolve};
};

const flush = () => act(async () => {});
const openChat = async () => {
  fireEvent.click(screen.getByLabelText('launcher'));
  await flush();
};
const ask = async text => {
  fireEvent.change(screen.getByLabelText('placeholder'), {
    target: {value: text},
  });
  fireEvent.click(screen.getByLabelText('send'));
  await flush();
};

let unlocked;
beforeEach(() => {
  jest.clearAllMocks();
  unlocked = true;
  useSelector.mockImplementation(() => unlocked);
  useMediaQuery.mockReturnValue(false);
  usePathname.mockReturnValue(null);
  useParams.mockReturnValue(null);
  getStarters.mockResolvedValue(STARTERS);
  send.mockResolvedValue(answer('First answer'));
});

describe('SupportChat behaviour', () => {
  it('fetches starters once on first open and shows the chips', async () => {
    render(<SupportChat />);
    expect(getStarters).not.toHaveBeenCalled();
    await openChat();
    expect(getStarters).toHaveBeenCalledTimes(1);
    expect(screen.getByText('How do I back up?')).toBeTruthy();
  });

  it('asks for starters for the current page using a route pattern', async () => {
    usePathname.mockReturnValue('/wallet/abc123/buy-crypto');
    useParams.mockReturnValue({clientId: 'abc123'});
    render(<SupportChat />);
    await openChat();
    expect(getStarters).toHaveBeenCalledWith(
      expect.anything(),
      '/wallet/[clientId]/buy-crypto',
    );
    expect(JSON.stringify(getStarters.mock.calls)).not.toContain('abc123');
  });

  it('refetches starters when reopened on a different page', async () => {
    usePathname.mockReturnValue('/auth/login');
    const {rerender} = render(<SupportChat />);
    await openChat();
    fireEvent.click(screen.getByLabelText('close'));
    usePathname.mockReturnValue('/wallets/import-wallet');
    rerender(<SupportChat />);
    await openChat();
    expect(getStarters).toHaveBeenCalledTimes(2);
    expect(getStarters).toHaveBeenLastCalledWith(
      expect.anything(),
      '/wallets/import-wallet',
    );
  });

  it('refreshes the chips when the page changes while the chat is open and empty', async () => {
    usePathname.mockReturnValue('/auth/login');
    const {rerender} = render(<SupportChat />);
    await openChat();
    usePathname.mockReturnValue('/wallets/import-wallet');
    rerender(<SupportChat />);
    await waitFor(() => expect(getStarters).toHaveBeenCalledTimes(2));
    expect(getStarters).toHaveBeenLastCalledWith(
      expect.anything(),
      '/wallets/import-wallet',
    );
  });

  it('keeps the chips once a question has been asked', async () => {
    usePathname.mockReturnValue('/auth/login');
    const {rerender} = render(<SupportChat />);
    await openChat();
    fireEvent.click(screen.getByText('How do I back up?'));
    await flush();
    expect(screen.getByText('First answer')).toBeTruthy();
    usePathname.mockReturnValue('/wallets/import-wallet');
    rerender(<SupportChat />);
    await flush();
    expect(getStarters).toHaveBeenCalledTimes(1);
  });

  it('shows related questions only under the latest answer and skips asked ones', async () => {
    send
      .mockResolvedValueOnce(
        answer('First answer', {
          related: [
            {id: 'r1', title: 'Related one'},
            {id: 'r2', title: 'Related two'},
          ],
        }),
      )
      .mockResolvedValueOnce(
        answer('Second answer', {
          related: [
            {id: 'r2', title: 'Related two'},
            {id: 'r3', title: 'Related three'},
          ],
        }),
      );
    render(<SupportChat />);
    await openChat();
    await ask('first question');
    expect(screen.getByText('Related one')).toBeTruthy();
    await ask('Related two');
    expect(screen.queryByText('Related one')).toBeNull();
    expect(screen.getByText('Related three')).toBeTruthy();
    // "Related two" was asked, so it appears only as the user's own bubble.
    expect(screen.getAllByText('Related two')).toHaveLength(1);
  });

  it('does not refetch starters when reopened', async () => {
    render(<SupportChat />);
    await openChat();
    fireEvent.click(screen.getByLabelText('close'));
    await openChat();
    expect(getStarters).toHaveBeenCalledTimes(1);
    expect(screen.getByText('How do I back up?')).toBeTruthy();
  });

  it('posts a chip pick and shows the answer', async () => {
    render(<SupportChat />);
    await openChat();
    fireEvent.click(screen.getByText('How do I back up?'));
    await flush();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toEqual({v: 1, type: 'chip', entryId: 's1'});
    expect(screen.getByText('First answer')).toBeTruthy();
  });

  it('sends only earlier answered turns as history', async () => {
    render(<SupportChat />);
    await openChat();
    await ask('first question');
    send.mockResolvedValueOnce(answer('Second answer'));
    await ask('second question');
    expect(send.mock.calls[0][0]).toEqual({
      v: 1,
      type: 'text',
      message: 'first question',
      history: [],
    });
    expect(send.mock.calls[1][0]).toEqual({
      v: 1,
      type: 'text',
      message: 'second question',
      history: ['first question'],
    });
  });

  it('blocks a seed phrase client-side without a request', async () => {
    render(<SupportChat />);
    await openChat();
    await ask(SEED);
    expect(send).not.toHaveBeenCalled();
    expect(screen.getByText('secretBlocked')).toBeTruthy();
    expect(screen.getByLabelText('placeholder').value).toBe('');
  });

  it('redacts a server-blocked message and never sends it as history', async () => {
    render(<SupportChat />);
    await openChat();
    send.mockResolvedValueOnce({
      status: 200,
      body: {v: 1, outcome: 'secret_blocked'},
      tokenSent: false,
    });
    await ask('my hidden secret');
    expect(screen.queryByText('my hidden secret')).toBeNull();
    expect(screen.getByText('redacted')).toBeTruthy();
    await ask('next question');
    expect(send.mock.calls[1][0].history).toEqual([]);
  });

  it('clears the conversation and aborts the request when the vault locks', async () => {
    const pending = deferred();
    send.mockReturnValueOnce(pending.promise);
    const {rerender} = render(<SupportChat />);
    await openChat();
    await ask('slow question');
    const signal = send.mock.calls[0][1];
    expect(signal.aborted).toBe(false);
    unlocked = false;
    rerender(<SupportChat />);
    await flush();
    expect(signal.aborted).toBe(true);
    expect(screen.queryByRole('dialog')).toBeNull();
    await openChat();
    expect(screen.queryByText('slow question')).toBeNull();
  });

  describe('timeout', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('shows the timeout message and ignores a late response', async () => {
      const pending = deferred();
      send.mockReturnValueOnce(pending.promise);
      render(<SupportChat />);
      await openChat();
      await ask('slow question');
      await act(async () => {
        jest.advanceTimersByTime(25000);
      });
      expect(screen.getByText('errors.timeout')).toBeTruthy();
      await act(async () => {
        pending.resolve(answer('Too late'));
      });
      expect(screen.queryByText('Too late')).toBeNull();
    });
  });

  it('closes on a hidden route and keeps the conversation when shown again', async () => {
    const {rerender} = render(<SupportChat />);
    await openChat();
    await ask('kept question');
    rerender(<SupportChat hidden />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByLabelText('launcher')).toBeNull();
    rerender(<SupportChat />);
    await openChat();
    expect(screen.getByText('kept question')).toBeTruthy();
    expect(screen.getByText('First answer')).toBeTruthy();
  });

  it('removes the launcher when the backend reports disabled', async () => {
    getStarters.mockResolvedValue({
      status: 404,
      body: {v: 1, code: 'disabled'},
      tokenSent: false,
    });
    render(<SupportChat />);
    await openChat();
    expect(screen.queryByLabelText('launcher')).toBeNull();
  });

  it('closes the full-screen dialog when an in-app link is followed on mobile', async () => {
    useMediaQuery.mockReturnValue(true);
    send.mockResolvedValue(answer('[Open settings](/settings)'));
    render(<SupportChat />);
    await openChat();
    fireEvent.click(screen.getByText('How do I back up?'));
    await flush();
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByText('Open settings'));
    // The MUI dialog leaves the DOM after its exit transition.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('closes on Escape and returns focus to the launcher', async () => {
    render(<SupportChat />);
    await openChat();
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
    fireEvent.keyDown(dialog, {key: 'Escape'});
    await flush();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText('launcher'));
  });

  it('shows the busy message with contact options when the hourly cap is hit', async () => {
    send.mockResolvedValue({
      status: 503,
      body: {v: 1, code: 'busy'},
      tokenSent: true,
    });
    render(<SupportChat />);
    await openChat();
    await ask('how do fees work');
    expect(screen.getByText('errors.busy')).toBeTruthy();
    expect(screen.getByText('contactEmail')).toBeTruthy();
    expect(screen.getByText('contactTelegram')).toBeTruthy();
    expect(screen.getByText('contactUs')).toBeTruthy();
  });

  it('shows the captcha message when no captcha token could be sent', async () => {
    send.mockResolvedValue({
      status: 401,
      body: {message: 'Missing x-captcha-token header'},
      tokenSent: false,
    });
    render(<SupportChat />);
    await openChat();
    await ask('how do fees work');
    expect(screen.getByText('errors.captcha')).toBeTruthy();
  });

  it('hides the Contact Us option while the wallet is locked', async () => {
    unlocked = false;
    send.mockResolvedValue({
      status: 200,
      body: {v: 1, outcome: 'not_covered', answer: '', related: []},
      tokenSent: true,
    });
    render(<SupportChat />);
    await openChat();
    await ask('will bitcoin go up');
    expect(screen.getByText('notCovered')).toBeTruthy();
    expect(screen.getByText('contactEmail')).toBeTruthy();
    expect(screen.queryByText('contactUs')).toBeNull();
  });
});
