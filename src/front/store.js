export const initialStore=()=>{
  return{
    message: null,
    favorites: [],

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

      if (store.favorites.find(fav => fav.title === action.payload.title)) return store;
      return {
        ...store,
        favorites: [...store.favorites, action.payload]
      };

case 'delete_favorite':
      return {
        ...store,
        favorites: store.favorites.filter((item, index) => index !== action.payload)
      };

    default:
      throw Error('Unknown action.');
  }    
};