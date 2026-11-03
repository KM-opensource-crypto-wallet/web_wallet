// Pure reducer for the support chat. No timers or network here: the component
// dispatches the actions and owns the AbortController.
export const MAX_TURNS = 4;

export const initialState = {
  messages: [],
  // Earlier user turns that were answered; sent as `history`, newest last.
  turns: [],
  // {requestId, type:'text'|'chip', message?, entryId?, history, turn} or null.
  pending: null,
  stillWorking: false,
  // null until the first GET succeeds; cached for the session afterwards.
  starters: null,
  linkHosts: [],
  startersLoading: false,
  startersError: null,
  // Route pattern the loaded starters were fetched for, and the one in flight.
  startersPath: null,
  startersRequestPath: null,
  // Set by a `disabled` reply: hides the launcher for the session.
  disabled: false,
  seq: 0,
};

const addMessage = (state, message) => ({
  messages: [...state.messages, {id: `m${state.seq + 1}`, ...message}],
  seq: state.seq + 1,
});

const keepTurns = (turns, turn) => [...turns, turn].slice(-MAX_TURNS);

const isCurrent = (state, requestId) =>
  state.pending !== null && state.pending.requestId === requestId;

const startRequest = (state, userText, pending) => {
  if (state.pending) return state;
  const requestId = state.seq + 1;
  // The user bubble's id is `m${requestId}`: the redaction step relies on it.
  const withUser = addMessage(state, {role: 'user', text: userText});
  return {
    ...state,
    ...withUser,
    stillWorking: false,
    pending: {requestId, history: state.turns, turn: userText, ...pending},
  };
};

export function chatReducer(state, action) {
  switch (action.type) {
    case 'startersStart': {
      const path = action.path ?? null;
      // Same page and already loaded, or a request in flight: nothing to do.
      if (state.startersLoading) return state;
      if (state.starters && state.startersPath === path) return state;
      return {
        ...state,
        startersLoading: true,
        startersError: null,
        startersRequestPath: path,
      };
    }
    case 'starters':
      return {
        ...state,
        starters: action.starters,
        linkHosts: action.linkHosts,
        startersPath: state.startersRequestPath,
        startersLoading: false,
        startersError: null,
      };
    case 'startersError':
      // A failed refresh keeps the chips already shown.
      return {
        ...state,
        startersLoading: false,
        startersError: state.starters ? null : action.code,
      };
    case 'send':
      return startRequest(state, action.text, {
        type: 'text',
        message: action.text,
      });
    case 'chip':
      return startRequest(state, action.title, {
        type: 'chip',
        entryId: action.id,
      });
    case 'clientSecret':
      // Nothing was sent: no user bubble, no turn.
      return {
        ...state,
        ...addMessage(state, {role: 'bot', kind: 'secretBlocked'}),
      };
    case 'answer': {
      if (!isCurrent(state, action.requestId)) return state;
      const {pending} = state;
      const base = {...state, pending: null, stillWorking: false};
      if (action.outcome === 'secret_blocked') {
        const messages = state.messages.map(m =>
          m.id === `m${pending.requestId}`
            ? {...m, text: '', redacted: true}
            : m,
        );
        return {
          ...base,
          messages,
          ...addMessage(
            {...base, messages},
            {role: 'bot', kind: 'secretBlocked'},
          ),
        };
      }
      const turns = keepTurns(state.turns, pending.turn);
      if (action.outcome === 'not_covered') {
        return {
          ...base,
          turns,
          ...addMessage(base, {role: 'bot', kind: 'notCovered'}),
        };
      }
      return {
        ...base,
        turns,
        ...addMessage(base, {
          role: 'bot',
          kind: 'answer',
          text: action.answer,
          related: action.related,
        }),
      };
    }
    case 'error':
    case 'timeout': {
      if (!isCurrent(state, action.requestId)) return state;
      const base = {...state, pending: null, stillWorking: false};
      return {
        ...base,
        ...addMessage(base, {
          role: 'bot',
          kind: 'error',
          code: action.type === 'timeout' ? 'timeout' : action.code,
        }),
      };
    }
    case 'stillWorking':
      return isCurrent(state, action.requestId)
        ? {...state, stillWorking: true}
        : state;
    case 'disabled':
      return {
        ...state,
        disabled: true,
        pending: null,
        stillWorking: false,
        startersLoading: false,
      };
    case 'reset':
      return {
        ...initialState,
        starters: state.starters,
        linkHosts: state.linkHosts,
        startersPath: state.startersPath,
        startersRequestPath: state.startersRequestPath,
        startersLoading: state.startersLoading,
        disabled: state.disabled,
        // Keep counting so ids from an aborted request can never match again.
        seq: state.seq,
      };
    default:
      return state;
  }
}
