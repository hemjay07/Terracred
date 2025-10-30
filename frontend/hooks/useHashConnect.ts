import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setLoading, setConnected, setDisconnected } from '../store/hashConnectSlice';

const useHashConnect = () => {
  const dispatch = useDispatch();
  const hashconnectState = useSelector((state: RootState) => state.hashconnect);
  const { isConnected, accountId, isLoading } = hashconnectState;

  useEffect(() => {
    const setupHashConnect = async () => {
      try {
        // Only run on client side
        if (typeof window === 'undefined') return;

        // Dynamically import HashConnect service
        const { getHashConnectInstance, getInitPromise, getConnectedAccountIds } = await import('../services/hashConnect');

        // Wait for HashConnect to initialize
        const instance = getHashConnectInstance();
        await getInitPromise();

        // Set up event listeners
        instance.pairingEvent.on((pairingData: any) => {
          console.log("Pairing event:", pairingData);
          const accountIds = getConnectedAccountIds();
          if (accountIds && accountIds.length > 0) {
            dispatch(setConnected({
              accountId: accountIds[0].toString()
            }));
          }
        });

        instance.disconnectionEvent.on(() => {
          console.log("Disconnection event");
          dispatch(setDisconnected());
        });

        instance.connectionStatusChangeEvent.on((connectionStatus: any) => {
          console.log("Connection status change:", connectionStatus);
        });

        // Check if already connected
        const accountIds = getConnectedAccountIds();
        if (accountIds && accountIds.length > 0) {
          dispatch(setConnected({
            accountId: accountIds[0].toString()
          }));
        }

        console.log("HashConnect setup completed");
      } catch (error) {
        console.error('HashConnect setup failed:', error);
        dispatch(setLoading(false));
      }
    };

    setupHashConnect();
  }, [dispatch]);

  const connect = async () => {
    dispatch(setLoading(true));
    try {
      // Only run on client side
      if (typeof window === 'undefined') return;

      // Dynamically import HashConnect service
      const { getHashConnectInstance } = await import('../services/hashConnect');

      console.log("Attempting to connect to wallet...");
      const instance = getHashConnectInstance();
      await instance.openPairingModal();
    } catch (error) {
      console.error('Connection failed:', error);
      dispatch(setLoading(false));
    }
  };

  const disconnect = async () => {
    try {
      // Only run on client side
      if (typeof window === 'undefined') return;

      // Dynamically import HashConnect service
      const { getHashConnectInstance } = await import('../services/hashConnect');

      const instance = getHashConnectInstance();
      instance.disconnect();
      dispatch(setDisconnected());
    } catch (error) {
      console.error('Disconnect failed:', error);
      dispatch(setDisconnected());
    }
  };

  return {
    isConnected,
    accountId,
    isLoading,
    connect,
    disconnect,
  };
};

export default useHashConnect; 