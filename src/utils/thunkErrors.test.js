import {reportThunkRejection} from './thunkErrors';
import {captureError} from 'services/logger';
import {showToast} from 'utils/toast';

jest.mock('services/logger', () => ({captureError: jest.fn()}));
jest.mock('utils/toast', () => ({showToast: jest.fn()}));

beforeEach(() => jest.clearAllMocks());

describe('reportThunkRejection', () => {
  it('captures the rejection with area/op tags', () => {
    const error = new Error('boom');
    reportThunkRejection({area: 'coins', op: 'fetch_all'})(error);
    expect(captureError).toHaveBeenCalledWith(error, {
      tags: {area: 'coins', op: 'fetch_all'},
    });
    expect(showToast).not.toHaveBeenCalled();
  });

  it('passes a plain-string payload through so captureError can wrap it', () => {
    reportThunkRejection({area: 'coins', op: 'fetch_all'})(
      'something went wrong',
    );
    expect(captureError).toHaveBeenCalledWith('something went wrong', {
      tags: {area: 'coins', op: 'fetch_all'},
    });
  });

  it('shows an error toast only when a title is given', () => {
    reportThunkRejection({
      area: 'coins',
      op: 'refresh',
      toast: 'Refresh failed',
    })(new Error('x'));
    expect(showToast).toHaveBeenCalledWith({
      type: 'errorToast',
      title: 'Refresh failed',
    });
  });
});
