import React, { createContext, useContext, useEffect, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTheme, type Theme, type ThemeName } from '../constants/Theme';

type AppState = {
  decks: any[];
  themeName: ThemeName;
};

type AppAction = {
  type: string;
  payload: any;
};

const initialState: AppState = {
  decks: [],
  themeName: 'dark',
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  theme: Theme;
  setTheme: (name: ThemeName) => Promise<void> | void;
  toggleTheme: () => Promise<void> | void;
}>({
  state: initialState,
  dispatch: () => null,
  theme: getTheme('dark'),
  setTheme: async () => {},
  toggleTheme: async () => {},
});

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_DECKS':
      return {
        ...state,
        decks: action.payload,
      };
    case 'SET_THEME':
      return {
        ...state,
        themeName: action.payload as ThemeName,
      };
    case 'ADD_DECK':
      return {
        ...state,
        decks: [...state.decks, action.payload],
      };
    case 'UPDATE_DECK':
      return {
        ...state,
        decks: state.decks.map((deck) =>
          deck.id === action.payload.id ? action.payload : deck
        ),
      };
    case 'DELETE_DECK':
      return {
        ...state,
        decks: state.decks.filter((deck) => deck.id !== action.payload),
      };
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load persisted theme on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('app_theme');
        if (stored === 'light' || stored === 'dark') {
          dispatch({ type: 'SET_THEME', payload: stored });
        }
      } catch (e) {
        // no-op
      }
    })();
  }, []);

  const setTheme = async (name: ThemeName) => {
    try {
      await AsyncStorage.setItem('app_theme', name);
    } catch {}
    dispatch({ type: 'SET_THEME', payload: name });
  };

  const toggleTheme = async () => {
    const next: ThemeName = state.themeName === 'dark' ? 'light' : 'dark';
    await setTheme(next);
  };

  const theme = getTheme(state.themeName);

  return (
    <AppContext.Provider value={{ state, dispatch, theme, setTheme, toggleTheme }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
