import { ConnectionStatus, EventType } from '@metamask/sdk-communication-layer';
import AppConstants from '../../AppConstants';
import { Connection } from '../Connection';
import SDKConnect from '../SDKConnect';
import watchConnection from './watchConnection';

jest.mock('@metamask/sdk-communication-layer');
jest.mock('../Connection');
jest.mock('../SDKConnect');
jest.mock('../../AppConstants');
jest.mock('../../../util/Logger');
jest.mock('../utils/DevLogger');
jest.mock('../SDKConnectConstants');

describe('watchConnection', () => {
  let mockInstance = {} as unknown as SDKConnect;
  let mockConnection = {} as unknown as Connection;

  const mockRemoteOn = jest.fn();
  const mockOn = jest.fn();
  const mockRemoveChannel = jest.fn();
  const mockUpdateSDKLoadingState = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUpdateSDKLoadingState.mockResolvedValue(undefined);

    mockConnection = {
      remote: {
        on: mockRemoteOn,
      },
      channelId: 'testChannelId',
      on: mockOn,
    } as unknown as Connection;

    mockInstance = {
      state: {
        disabledHosts: {},
      },
      removeChannel: mockRemoveChannel,
      emit: jest.fn(),
      updateSDKLoadingState: mockUpdateSDKLoadingState,
    } as unknown as SDKConnect;
  });

  it('should listen for connection status changes', () => {
    watchConnection(mockConnection, mockInstance);

    expect(mockRemoteOn).toHaveBeenCalledWith(
      EventType.CONNECTION_STATUS,
      expect.any(Function),
    );
  });

  describe('Handling TERMINATED connection status', () => {
    it('should remove the channel if connection status is TERMINATED', () => {
      watchConnection(mockConnection, mockInstance);

      const mockConnectionStatus = ConnectionStatus.TERMINATED;

      const mockConnectionStatusListener = mockRemoteOn.mock.calls[0][1];

      mockConnectionStatusListener(mockConnectionStatus);

      expect(mockRemoveChannel).toHaveBeenCalledWith({
        channelId: mockConnection.channelId,
        emitRefresh: true,
        sendTerminate: false,
      });
    });
  });

  describe('Handling CLIENTS_DISCONNECTED event', () => {
    beforeEach(() => {
      mockInstance.state.disabledHosts = {
        [AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + mockConnection.channelId]: 0,
      };
    });

    it('should update SDK loading state on CLIENTS_DISCONNECTED', () => {
      watchConnection(mockConnection, mockInstance);

      const mockClientsDisconnectedListener = mockRemoteOn.mock.calls[1][1];

      mockClientsDisconnectedListener();

      expect(mockUpdateSDKLoadingState).toHaveBeenCalled();
    });

    it('should remove the channel if it is disabled on CLIENTS_DISCONNECTED', () => {
      watchConnection(mockConnection, mockInstance);

      const mockClientsDisconnectedListener = mockRemoteOn.mock.calls[1][1];

      mockClientsDisconnectedListener();

      expect(mockRemoveChannel).toHaveBeenCalledWith({
        channelId: mockConnection.channelId,
        sendTerminate: true,
      });
    });
  });

  describe('Handling CONNECTION_LOADING_EVENT', () => {
    it('should update SDK loading state on CONNECTION_LOADING_EVENT', () => {
      watchConnection(mockConnection, mockInstance);

      const mockConnectionLoadingEventListener = mockOn.mock.calls[0][1];

      mockConnectionLoadingEventListener({ loading: true });

      expect(mockUpdateSDKLoadingState).toHaveBeenCalledWith({
        channelId: mockConnection.channelId,
        loading: true,
      });
    });
  });
});
