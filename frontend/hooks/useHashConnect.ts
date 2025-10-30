'use client';

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
        if (typeof window === 'undefined') return;

        const { getHashConnectInstance, getConnectedAccountIds } = await import('../services/hashConnect');
        // getHashConnectInstance already waits for initialization to complete
        const instance = await getHashConnectInstance();

        // Pairing event listener
        instance.pairingEvent.on(async () => {
          const accounts = await getConnectedAccountIds();
          if (accounts?.length > 0) {
            dispatch(setConnected({ accountId: accounts[0].toString() }));
          }
        });

        // Disconnect listener
        instance.disconnectionEvent.on(() => {
          dispatch(setDisconnected());
        });

        // Check if already connected
        const accounts = await getConnectedAccountIds();
        if (accounts?.length > 0) {
          dispatch(setConnected({ accountId: accounts[0].toString() }));
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
      if (typeof window === 'undefined') return;

      const { getHashConnectInstance } = await import('../services/hashConnect');
      const instance = await getHashConnectInstance(); // Now waits for initialization

      console.log("Attempting to connect to wallet...");

      // ✅ Delay before calling modal
      setTimeout(async () => {
        try {
          await instance.openPairingModal();
        } catch (modalError) {
          console.error('Pairing modal failed:', modalError);
          dispatch(setLoading(false));
        }
      }, 500);

    } catch (error) {
      console.error('Connection failed:', error);
      dispatch(setLoading(false));
    }
  };

  const disconnect = async () => {
    try {
      if (typeof window === 'undefined') return;

      const { getHashConnectInstance } = await import('../services/hashConnect');
      const instance = await getHashConnectInstance(); // Now waits for initialization

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
