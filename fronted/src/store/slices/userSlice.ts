import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: string;
  status: 'active' | 'inactive' | 'banned';
  createdAt: string;
  updatedAt: string;
}

interface UserState {
  currentUser: UserProfile | null;
  users: UserProfile[];
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  currentUser: null,
  users: [],
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setCurrentUser: (state, action: PayloadAction<UserProfile>) => {
      state.currentUser = action.payload;
    },
    setUsers: (state, action: PayloadAction<UserProfile[]>) => {
      state.users = action.payload;
    },
    addUser: (state, action: PayloadAction<UserProfile>) => {
      state.users.push(action.payload);
    },
    updateUser: (state, action: PayloadAction<UserProfile>) => {
      const index = state.users.findIndex(user => user.id === action.payload.id);
      if (index !== -1) {
        state.users[index] = action.payload;
      }
      if (state.currentUser?.id === action.payload.id) {
        state.currentUser = action.payload;
      }
    },
    deleteUser: (state, action: PayloadAction<string>) => {
      state.users = state.users.filter(user => user.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setCurrentUser,
  setUsers,
  addUser,
  updateUser,
  deleteUser,
  setLoading,
  setError,
  clearError,
} = userSlice.actions;

export default userSlice.reducer;
