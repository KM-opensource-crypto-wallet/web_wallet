import {chatReducer, initialState, MAX_TURNS} from './chatState';

const run = (actions, start = initialState) =>
  actions.reduce(chatReducer, start);

const answer = (requestId, extra = {}) => ({
  type: 'answer',
  requestId,
  outcome: 'answered',
  answer: 'Use **Forgot password**.',
  related: [{id: 'r1', title: 'Related'}],
  ...extra,
});

describe('chatReducer', () => {
  it('starters flow: start, success, retry after failure', () => {
    let s = run([{type: 'startersStart'}]);
    expect(s.startersLoading).toBe(true);
    s = run([{type: 'startersError', code: 'unavailable'}], s);
    expect(s).toMatchObject({
      startersLoading: false,
      startersError: 'unavailable',
    });
    s = run([{type: 'startersStart'}], s);
    expect(s).toMatchObject({startersLoading: true, startersError: null});
    s = run(
      [
        {
          type: 'starters',
          starters: [{id: 'a', title: 'A'}],
          linkHosts: ['t.me'],
        },
      ],
      s,
    );
    expect(s.starters).toEqual([{id: 'a', title: 'A'}]);
    expect(s.linkHosts).toEqual(['t.me']);
    // Cached: a later open does not refetch.
    expect(chatReducer(s, {type: 'startersStart'})).toBe(s);
  });

  it('send adds a user bubble and a pending request with prior history', () => {
    const s = run([{type: 'send', text: 'hello'}]);
    expect(s.messages).toEqual([{id: 'm1', role: 'user', text: 'hello'}]);
    expect(s.pending).toMatchObject({
      requestId: 1,
      type: 'text',
      message: 'hello',
      history: [],
    });
    expect(s.turns).toEqual([]);
  });

  it('stores the turn only after an answer and sends turns before the new message', () => {
    let s = run([{type: 'send', text: 'q1'}, answer(1)]);
    expect(s.turns).toEqual(['q1']);
    expect(s.pending).toBeNull();
    expect(s.messages[1]).toMatchObject({
      kind: 'answer',
      related: [{id: 'r1', title: 'Related'}],
    });
    s = run([{type: 'send', text: 'q2'}], s);
    expect(s.pending.history).toEqual(['q1']);
  });

  it('chip stores its title as the turn and sends the entry id', () => {
    const s = run([
      {type: 'chip', id: 'e1', title: 'Forgot password'},
      answer(1),
    ]);
    expect(s.messages[0].text).toBe('Forgot password');
    expect(s.turns).toEqual(['Forgot password']);
    const p = run([{type: 'chip', id: 'e1', title: 'T'}]).pending;
    expect(p).toMatchObject({type: 'chip', entryId: 'e1'});
  });

  it('not_covered stores the turn and adds a notCovered message', () => {
    const s = run([
      {type: 'send', text: 'weather?'},
      {
        type: 'answer',
        requestId: 1,
        outcome: 'not_covered',
        answer: '',
        related: [],
      },
    ]);
    expect(s.turns).toEqual(['weather?']);
    expect(s.messages[1]).toMatchObject({role: 'bot', kind: 'notCovered'});
  });

  it('secret_blocked redacts the user bubble and stores no turn', () => {
    const s = run([
      {type: 'send', text: 'secret words'},
      {
        type: 'answer',
        requestId: 1,
        outcome: 'secret_blocked',
        answer: '',
        related: [],
      },
    ]);
    expect(s.turns).toEqual([]);
    expect(s.messages[0]).toMatchObject({
      role: 'user',
      text: '',
      redacted: true,
    });
    expect(s.messages[1]).toMatchObject({kind: 'secretBlocked'});
    expect(JSON.stringify(s)).not.toContain('secret words');
  });

  it('clientSecret adds only a bot message: no bubble, no turn, no request', () => {
    const s = run([{type: 'clientSecret'}]);
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0]).toMatchObject({role: 'bot', kind: 'secretBlocked'});
    expect(s.turns).toEqual([]);
    expect(s.pending).toBeNull();
  });

  it('error adds an error message and keeps no turn', () => {
    const s = run([
      {type: 'send', text: 'q'},
      {type: 'error', requestId: 1, code: 'rate_limited'},
    ]);
    expect(s.messages[1]).toMatchObject({kind: 'error', code: 'rate_limited'});
    expect(s.turns).toEqual([]);
    expect(s.pending).toBeNull();
  });

  it('stillWorking applies to the current request only', () => {
    let s = run([{type: 'send', text: 'q'}]);
    expect(chatReducer(s, {type: 'stillWorking', requestId: 99})).toBe(s);
    s = chatReducer(s, {type: 'stillWorking', requestId: 1});
    expect(s.stillWorking).toBe(true);
    s = chatReducer(s, answer(1));
    expect(s.stillWorking).toBe(false);
  });

  it('timeout ends the request, and a late answer is dropped', () => {
    let s = run([
      {type: 'send', text: 'q'},
      {type: 'timeout', requestId: 1},
    ]);
    expect(s.messages[1]).toMatchObject({kind: 'error', code: 'timeout'});
    const before = s;
    s = chatReducer(s, answer(1));
    expect(s).toBe(before);
  });

  it('drops answers and errors for a different request id', () => {
    const s = run([{type: 'send', text: 'q'}]);
    expect(chatReducer(s, answer(2))).toBe(s);
    expect(chatReducer(s, {type: 'error', requestId: 2, code: 'x'})).toBe(s);
    expect(chatReducer(s, {type: 'timeout', requestId: 2})).toBe(s);
  });

  it('ignores a new send or chip while a request is pending', () => {
    const s = run([{type: 'send', text: 'q'}]);
    expect(chatReducer(s, {type: 'send', text: 'again'})).toBe(s);
    expect(chatReducer(s, {type: 'chip', id: 'e', title: 'T'})).toBe(s);
  });

  it('never keeps more than 4 turns', () => {
    let s = initialState;
    for (let i = 1; i <= 7; i++) {
      s = run([{type: 'send', text: `q${i}`}, answer(s.seq + 1)], s);
    }
    expect(s.turns).toEqual(['q4', 'q5', 'q6', 'q7']);
    expect(s.turns).toHaveLength(MAX_TURNS);
    s = run([{type: 'send', text: 'q8'}], s);
    expect(s.pending.history).toHaveLength(MAX_TURNS);
  });

  it('reset clears the conversation but keeps starters, and drops late answers', () => {
    let s = run([
      {
        type: 'starters',
        starters: [{id: 'a', title: 'A'}],
        linkHosts: ['t.me'],
      },
      {type: 'send', text: 'q'},
    ]);
    s = chatReducer(s, {type: 'reset'});
    expect(s.messages).toEqual([]);
    expect(s.turns).toEqual([]);
    expect(s.pending).toBeNull();
    expect(s.starters).toHaveLength(1);
    const after = chatReducer(s, answer(1));
    expect(after).toBe(s);
    // A fresh request after reset gets a new id.
    s = chatReducer(s, {type: 'send', text: 'q2'});
    expect(s.pending.requestId).toBeGreaterThan(1);
  });

  it('disabled hides for the session and survives reset', () => {
    let s = run([{type: 'send', text: 'q'}, {type: 'disabled'}]);
    expect(s.disabled).toBe(true);
    expect(s.pending).toBeNull();
    s = chatReducer(s, {type: 'reset'});
    expect(s.disabled).toBe(true);
  });

  it('never logs message or answer text', () => {
    const spies = ['log', 'warn', 'error', 'info', 'debug'].map(m =>
      jest.spyOn(console, m).mockImplementation(() => {}),
    );
    run([
      {type: 'send', text: 'PRIVATE-TEXT'},
      answer(1, {answer: 'ANSWER-TEXT'}),
    ]);
    spies.forEach(spy => {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  it('ignores unknown actions', () => {
    expect(chatReducer(initialState, {type: 'nope'})).toBe(initialState);
  });
});

describe('page-aware starters', () => {
  const loaded = (path, starters = [{id: 'a', title: 'A'}]) =>
    run([
      {type: 'startersStart', path},
      {type: 'starters', starters, linkHosts: []},
    ]);

  it('remembers the page the starters were loaded for', () => {
    expect(loaded('/auth/login').startersPath).toBe('/auth/login');
    expect(loaded(undefined).startersPath).toBeNull();
  });

  it('does not refetch on the same page', () => {
    const s = loaded('/auth/login');
    expect(chatReducer(s, {type: 'startersStart', path: '/auth/login'})).toBe(
      s,
    );
  });

  it('refetches on a different page and keeps the old chips meanwhile', () => {
    const s = chatReducer(loaded('/auth/login'), {
      type: 'startersStart',
      path: '/wallets/import-wallet',
    });
    expect(s.startersLoading).toBe(true);
    expect(s.startersRequestPath).toBe('/wallets/import-wallet');
    expect(s.starters).toEqual([{id: 'a', title: 'A'}]);
    const done = chatReducer(s, {
      type: 'starters',
      starters: [{id: 'b', title: 'B'}],
      linkHosts: [],
    });
    expect(done.startersPath).toBe('/wallets/import-wallet');
    expect(done.starters).toEqual([{id: 'b', title: 'B'}]);
  });

  it('ignores a start while one is in flight', () => {
    const s = chatReducer(initialState, {type: 'startersStart', path: '/a'});
    expect(chatReducer(s, {type: 'startersStart', path: '/b'})).toBe(s);
  });

  it('a failed refresh keeps the chips and shows no error', () => {
    const s = run(
      [
        {type: 'startersStart', path: '/b'},
        {type: 'startersError', code: 'timeout'},
      ],
      loaded('/a'),
    );
    expect(s.starters).toEqual([{id: 'a', title: 'A'}]);
    expect(s.startersError).toBeNull();
  });

  it('a failed first load still shows the error', () => {
    const s = run([
      {type: 'startersStart', path: '/a'},
      {type: 'startersError', code: 'timeout'},
    ]);
    expect(s.startersError).toBe('timeout');
  });

  it('reset keeps the loaded page', () => {
    expect(chatReducer(loaded('/a'), {type: 'reset'}).startersPath).toBe('/a');
  });
});
