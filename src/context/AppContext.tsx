import React, { createContext, useContext, useReducer } from 'react';

type AppState = {
  decks: any[];
};

type AppAction = {
  type: string;
  payload: any;
};

const initialState: AppState = {
  decks: [],
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}>({
  state: initialState,
  dispatch: () => null,
});

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_DECKS':
      return {
        ...state,
        decks: action.payload,
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

  return (
    <AppContext.Provider value={{ state, dispatch }}>
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
