export const initialStore=()=>{
  return{
    favorites: [],

    selectedBook: JSON.parse(localStorage.getItem("selected_book")) || null,
    initialEventList: [
      { title: "Classic Novel Club", date: "May 25 • 6:00 PM", icon: "📖" },
      { title: "Sci‑Fi Readers Meetup", date: "May 28 • 7:30 PM", icon: "🚀" },
      { title: "Author Talk: Elena Márquez", date: "June 2 • 5:00 PM", icon: "🎤" },
      { title: "Silent Reading Party", date: "June 5 • 8:00 PM", icon: "☕" },
      { title: "Creative Writing Workshop", date: "June 10 • 4:00 PM", icon: "📝" },
      { title: "Book Swap Sunday", date: "June 15 • 11:00 AM", icon: "🔄" }
    ],
    eventGlobalList: []
  }
}

export default function storeReducer(store, action = {}) {
  switch(action.type){
    case 'add_event':
      return {
        ...store,
        eventGlobalList: [...store.eventGlobalList, action.payload]
      };


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
      localStorage.setItem("selected_book", JSON.stringify(action.payload));
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
        localStorage.removeItem("selected_book");
    }

      return {
        ...store,
        favorites: updatedFavorites,
        selectedBook: newSelectedBook
      };

    default:
      return store;
  }    
};