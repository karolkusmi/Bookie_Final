export const initialStore=()=>{
  return{
    message: null,
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
    default:
      throw Error('Unknown action.');
  }    
}