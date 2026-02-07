export const initialStore = () => ({
  favorites: [],
  selectedBook: null,
  eventGlobalList: [],
});

function notifyEventsChanged(list) {
  setTimeout(() => {
    window.dispatchEvent(new Event("local-storage-changed"));
  }, 0);
}

export default function storeReducer(store, action = {}) {
  switch (action.type) {
    case "set_events": {
      const list = Array.isArray(action.payload) ? action.payload : [];
      notifyEventsChanged(list);
      return { ...store, eventGlobalList: list };
    }

    case "add_event": {
      const next = [...store.eventGlobalList, action.payload];
      notifyEventsChanged(next);
      return { ...store, eventGlobalList: next };
    }

    case "delete_event": {
      const idToDelete = action.payload;
      const filtered = (store.eventGlobalList || []).filter((ev) => ev.id !== idToDelete);
      notifyEventsChanged(filtered);
      return { ...store, eventGlobalList: filtered };
    }


case 'add_favorite':
const exists = store.favorites.some(fav => 
        (fav.isbn && fav.isbn === action.payload.isbn) || 
        fav.title === action.payload.title
    );

if (exists) {
        console.warn("Este libro ya está en tus favoritos");
        return store;
    }

    return {
        ...store,
        favorites: [...store.favorites, action.payload]
    };

      case 'set_selected_book':
      return {
        ...store,
        selectedBook: action.payload
      };

case 'delete_favorite':


      const updatedFavorites = store.favorites.filter((_, index) => index !== action.payload);

      const bookBeingRemoved = store.favorites[action.payload];
      let newSelected = store.selectedBook;
    
    if (store.selectedBook && bookBeingRemoved && store.selectedBook.title === bookBeingRemoved.title) {
        newSelected = null;
    }

      return {
        ...store,
        favorites: updatedFavorites,
        selectedBook: newSelected
      };

    default:
      return store;
  }    
};