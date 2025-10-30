import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface HashConnectState {
  isConnected: boolean;
  accountId: string | null;
  isLoading: boolean;
}

const initialState: HashConnectState = {
  isConnected: false,
  accountId: null,
  isLoading: false,
};

const hashconnectSlice = createSlice({
  name: 'hashconnect',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setConnected: (state, action: PayloadAction<{ accountId: string }>) => {
      state.isConnected = true;
      state.accountId = action.payload.accountId;
      state.isLoading = false;
    },
    setDisconnected: (state) => {
      state.isConnected = false;
      state.accountId = null;
      state.isLoading = false;
    },
  },
});

export const { setLoading, setConnected, setDisconnected } = hashconnectSlice.actions;
export default hashconnectSlice.reducer; 