import { StreamChat } from "stream-chat";

// Clave API de Stream Chat (pública - segura en frontend)
const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

// URL del backend para llamadas API
const BACKEND_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

// Instancia única del cliente (singleton)
let clientInstance = null;

/**
 * Obtiene o crea la instancia del cliente Stream Chat
 * @returns {StreamChat} El cliente Stream Chat
 */
export const getStreamClient = () => {
  if (!clientInstance && STREAM_API_KEY) {
    clientInstance = StreamChat.getInstance(STREAM_API_KEY);
  }
  return clientInstance;
};

/**
 * Normaliza el ISBN eliminando guiones y espacios
 * @param {string} isbn - El ISBN a normalizar
 * @returns {string} ISBN normalizado
 */
export const normalizeIsbn = (isbn) => {
  return (isbn || "").replace(/-/g, "").replace(/\s/g, "").toUpperCase();
};

/**
 * Genera un ID de canal consistente a partir del ISBN del libro
 * Así todos los usuarios que debaten el mismo libro (por ISBN) entran en el mismo canal
 * @param {string} isbn - El ISBN del libro
 * @returns {string} El ID del canal
 */
export const generateBookChannelIdByIsbn = (isbn) => {
  const normalized = normalizeIsbn(isbn);
  if (!normalized) return null;
  return `book-isbn-${normalized}`;
};

/**
 * Genera un ID de canal consistente a partir del título del libro (legacy, se mantiene por compatibilidad)
 * Así todos los usuarios que debaten el mismo libro entran en el mismo canal
 * @param {string} bookTitle - El título del libro
 * @returns {string} El ID del canal
 * @deprecated Usar generateBookChannelIdByIsbn para mejor coincidencia
 */
export const generateBookChannelId = (bookTitle) => {
  return `book-${bookTitle
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Elimina acentos
    .replace(/[^a-z0-9\s-]/g, "") // Elimina caracteres especiales
    .replace(/\s+/g, "-") // Sustituye espacios por guiones
    .replace(/-+/g, "-") // Unifica varios guiones en uno solo
    .trim()}`;
};

/**
 * Conecta un usuario a Stream Chat
 * @param {string} userId - ID del usuario en el backend
 * @param {string} userName - Nombre para mostrar del usuario
 * @param {string} streamToken - Token de Stream generado por el backend
 * @param {string} userImage - URL opcional del avatar del usuario
 * @returns {Promise<Object>} Objeto del usuario conectado
 */
export const connectUser = async (
  userId,
  userName,
  streamToken,
  userImage = null,
) => {
  const client = getStreamClient();

  if (!client) {
    throw new Error(
      "Stream Chat client not initialized. Check VITE_STREAM_API_KEY.",
    );
  }

  // Desconectar primero cualquier usuario existente
  if (client.userID) {
    await client.disconnectUser();
  }

  const userConfig = {
    id: userId,
    name: userName,
  };

  if (userImage) {
    userConfig.image = userImage;
  }

  return await client.connectUser(userConfig, streamToken);
};

/**
 * Desconecta al usuario actual de Stream Chat
 */
export const disconnectUser = async () => {
  const client = getStreamClient();
  if (client && client.userID) {
    await client.disconnectUser();
  }
};

/**
 * Crea o se une a un canal de discusión de libro usando el ISBN
 * @param {Object} book - Objeto libro con isbn, title, thumbnail, authors
 * @returns {Promise<Object>} El objeto canal
 */
export const createOrJoinBookChannelByIsbn = async (book) => {
  const client = getStreamClient();

  if (!client || !client.userID) {
    throw new Error("User must be connected before creating a channel");
  }

  const accessToken = localStorage.getItem("access_token");
  if (!accessToken) {
    throw new Error("No access token found");
  }

  const isbn = normalizeIsbn(book?.isbn);
  if (!isbn) {
    throw new Error("Book must have a valid ISBN to create a chat");
  }

  const response = await fetch(`${BACKEND_URL}/chat/create-or-join-channel-by-isbn`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      isbn: isbn,
      book_title: book.title || "Libro sin título",
      thumbnail: book.thumbnail || null,
      authors: book.authors || [],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Error creating/joining channel");
  }

  const data = await response.json();
  const channelId = data.channel_id;

  const channel = client.channel("messaging", channelId);
  await channel.watch();

  return channel;
};

/**
 * Crea o se une a un canal de discusión de libro (legacy - por título)
 * @param {string} bookTitle - El libro del que se debate
 * @returns {Promise<Object>} El objeto canal
 * @deprecated Usar createOrJoinBookChannelByIsbn para coincidencia por ISBN
 */
export const createOrJoinBookChannel = async (bookTitle) => {
  const client = getStreamClient();

  if (!client || !client.userID) {
    throw new Error("User must be connected before creating a channel");
  }

  const accessToken = localStorage.getItem("access_token");
  if (!accessToken) {
    throw new Error("No access token found");
  }

  // Usar la API del backend para crear/unirse al canal (el servidor tiene permisos)
  const response = await fetch(`${BACKEND_URL}/chat/create-or-join-channel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ book_title: bookTitle }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Error creating/joining channel");
  }

  const data = await response.json();
  const channelId = data.channel_id;

  // Ahora suscribirse al canal desde el cliente
  const channel = client.channel("messaging", channelId);
  await channel.watch();

  return channel;
};

/**
 * Función legacy para compatibilidad hacia atrás
 * @deprecated Usar createOrJoinBookChannel en su lugar
 */
export const createBookChannel = async (
  channelId,
  bookTitle,
  memberIds = [],
) => {
  const client = getStreamClient();

  if (!client || !client.userID) {
    throw new Error("User must be connected before creating a channel");
  }

  const channel = client.channel("messaging", channelId, {
    name: `📚 ${bookTitle}`,
    book_title: bookTitle,
    members: memberIds,
  });

  await channel.watch();
  return channel;
};

/**
 * Obtiene un canal existente por ID
 * @param {string} channelId - El ID del canal
 * @returns {Promise<Object>} El objeto canal
 */
export const getChannel = async (channelId) => {
  const client = getStreamClient();

  if (!client || !client.userID) {
    throw new Error("User must be connected before accessing a channel");
  }

  const channel = client.channel("messaging", channelId);
  await channel.watch();
  return channel;
};

/**
 * Obtiene todos los canales de los que el usuario actual es miembro
 * @returns {Promise<Array>} Array de objetos canal
 */
export const getUserChannels = async () => {
  const client = getStreamClient();

  if (!client || !client.userID) {
    throw new Error("User must be connected before fetching channels");
  }

  const filter = {
    type: "messaging",
    members: { $in: [client.userID] },
  };
  const sort = [{ last_message_at: -1 }];

  const channels = await client.queryChannels(filter, sort, {
    watch: true,
    state: true,
  });

  return channels;
};

/**
 * Obtiene todos los canales públicos de discusión de libros (no solo los del usuario)
 * Usa la API del backend para obtener canales (el servidor tiene permisos)
 * @returns {Promise<Array>} Array de objetos de datos de canal
 */
export const getAllBookChannels = async () => {
  const client = getStreamClient();

  if (!client || !client.userID) {
    throw new Error("User must be connected before fetching channels");
  }

  const accessToken = localStorage.getItem("access_token");
  if (!accessToken) {
    throw new Error("No access token found");
  }

  // Usar la API del backend para obtener canales públicos
  const response = await fetch(`${BACKEND_URL}/chat/public-channels`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Error fetching channels");
  }

  const data = await response.json();

  // Convertir la respuesta del backend a objetos tipo canal para compatibilidad
  // El backend devuelve datos de canal simplificados, hay que formatearlos
  return data.channels.map((ch) => ({
    id: ch.id,
    data: {
      name: ch.name,
      book_title: ch.book_title,
      member_count: ch.member_count,
    },
    state: {
      members: {}, // No tenemos datos completos de miembros desde el backend
    },
  }));
};

/**
 * Se une a un canal de libro existente
 * Usa la API del backend para unirse (el servidor tiene permisos)
 * @param {string} channelId - ID del canal al que unirse
 * @returns {Promise<Object>} El objeto canal
 */
export const joinBookChannel = async (channelId) => {
  const client = getStreamClient();

  if (!client || !client.userID) {
    throw new Error("User must be connected before joining a channel");
  }

  const accessToken = localStorage.getItem("access_token");
  if (!accessToken) {
    throw new Error("No access token found");
  }

  // Usar la API del backend para unirse al canal (el servidor tiene permisos)
  const response = await fetch(
    `${BACKEND_URL}/chat/join-channel/${channelId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Error joining channel");
  }

  // Ahora suscribirse al canal desde el cliente
  const channel = client.channel("messaging", channelId);
  await channel.watch();

  return channel;
};

/**
 * Comprueba si el usuario actual es miembro de un canal
 * @param {Object} channel - Objeto canal (puede ser canal completo o simplificado del backend)
 * @returns {boolean}
 */
export const isUserMemberOfChannel = (channel) => {
  const client = getStreamClient();
  if (!client || !client.userID || !channel) return false;

  // Para objetos canal completos de Stream
  if (channel.state?.members) {
    const members = channel.state.members;
    return Object.keys(members).includes(client.userID);
  }

  // Para datos de canal simplificados del backend no podemos saberlo con certeza
  // Devolver false para mostrar el botón "Unirse" (volver a unirse es inofensivo)
  return false;
};

/**
 * Comprueba si el usuario está conectado actualmente a Stream
 * @returns {boolean}
 */
export const isUserConnected = () => {
  const client = getStreamClient();
  return client && client.userID !== undefined;
};

/**
 * Obtiene el ID del usuario conectado actualmente
 * @returns {string|null}
 */
export const getCurrentUserId = () => {
  const client = getStreamClient();
  return client?.userID || null;
};

/**
 * Obtiene el número de miembros de un canal
 * @param {Object} channel - Objeto canal (puede ser completo o simplificado del backend)
 * @returns {number}
 */
export const getChannelMemberCount = (channel) => {
  if (!channel) return 0;

  // Para datos de canal simplificados del backend
  if (channel.data?.member_count !== undefined) {
    return channel.data.member_count;
  }

  // Para objetos canal completos de Stream
  if (channel.state?.members) {
    return Object.keys(channel.state.members).length;
  }

  return 0;
};

/**
 * Abandona un canal (elimina al usuario actual de los miembros)
 * @param {string} channelId - ID del canal a abandonar
 * @returns {Promise<void>}
 */
export const leaveChannel = async (channelId) => {
  const client = getStreamClient();

  if (!client || !client.userID) {
    throw new Error("User must be connected before leaving a channel");
  }

  const channel = client.channel("messaging", channelId);
  await channel.removeMembers([client.userID]);
};

/**
 * Elimina un canal (solo el creador puede hacerlo)
 * @param {string} channelId - ID del canal a eliminar
 * @returns {Promise<void>}
 */
export const deleteChannel = async (channelId) => {
  const client = getStreamClient();

  if (!client || !client.userID) {
    throw new Error("User must be connected before deleting a channel");
  }

  const channel = client.channel("messaging", channelId);
  await channel.delete();
};

/**
 * Comprueba si el usuario actual es el creador del canal
 * @param {Object} channel - El objeto canal
 * @returns {boolean}
 */
export const isChannelCreator = (channel) => {
  const client = getStreamClient();
  if (!client || !client.userID || !channel) return false;

  const createdById =
    channel.data?.created_by_id || channel.data?.created_by?.id;
  return createdById === client.userID;
};

/**
 * Obtiene la información del creador del canal
 * @param {Object} channel - El objeto canal
 * @returns {Object|null}
 */
export const getChannelCreator = (channel) => {
  if (!channel || !channel.data) return null;
  return channel.data.created_by || null;
};

export { clientInstance as client };
