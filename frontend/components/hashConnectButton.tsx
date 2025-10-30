import React from 'react';
import useHashConnect from '../hooks/useHashConnect';
import styles from './HashConnectButton.module.css';

const HashConnectButton: React.FC = () => {
  const { isConnected, accountId, isLoading, connect, disconnect } = useHashConnect();

  const formatAccountId = (id: string) => {
    return `${id.slice(0, 6)}...${id.slice(-4)}`;
  };    

  return (
    <div className={styles.container}>
      {!isConnected ? (
        <button 
          className={styles.connectButton}
          onClick={connect}
          disabled={isLoading}
        >
          {isLoading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <div className={styles.connectedContainer}>
          <span className={styles.accountId}>
            Connected: {formatAccountId(accountId || '')}
          </span>
          <button 
            className={styles.disconnectButton}
            onClick={disconnect}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};

export default HashConnectButton; 