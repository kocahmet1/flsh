
import React, { createContext, useReducer, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AppContext = createContext();

const initialState = {
  decks: [],
  loading: true,
  userId: null
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_DECKS':
      return { ...state, decks: action.payload, loading: false };
    case 'ADD_DECK':
      const updatedDecks = [...state.decks, action.payload];
      AsyncStorage.setItem('flashcards_decks', JSON.stringify(updatedDecks));
      return { ...state, decks: updatedDecks };
    case 'UPDATE_DECK':
      const newDecks = state.decks.map(deck => 
        deck.id === action.payload.id ? action.payload : deck
      );
      AsyncStorage.setItem('flashcards_decks', JSON.stringify(newDecks));
      return { ...state, decks: newDecks };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  React.useEffect(() => {
    async function loadDecks() {
      try {
        const decksData = await AsyncStorage.getItem('flashcards_decks');
        dispatch({ type: 'SET_DECKS', payload: decksData ? JSON.parse(decksData) : [] });
      } catch (error) {
        console.error('Error loading decks:', error);
      }
    }
    loadDecks();
  }, []);

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
