interface AniListResponse<T> {
  data: T | null;
  error: string | null;
}

interface AniListUser {
  id: number;
  name: string;
  avatar: {
    large: string;
  };
  statistics: {
    manga: {
      count: number;
      chaptersRead: number;
    };
  };
}

/**
 * Generic function to query the AniList API
 */
async function queryAniList<T>(
  query: string,
  token: string,
  variables?: Record<string, any>,
): Promise<AniListResponse<T>> {
  try {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    const data = await response.json();

    if (data.errors) {
      return {
        data: null,
        error: data.errors[0].message,
      };
    }

    return {
      data: data.data,
      error: null,
    };
  } catch (err) {
    console.error("AniList API Error:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to fetch data",
    };
  }
}

/**
 * Fetch the current user's data
 */
export async function fetchUserData(
  token: string,
): Promise<AniListResponse<{ Viewer: AniListUser }>> {
  const query = `
    query {
      Viewer {
        id
        name
        avatar {
          large
        }
        statistics {
          manga {
            count
            chaptersRead
          }
        }
      }
    }
  `;

  return queryAniList(query, token);
}

/**
 * Example: Fetch user's manga list
 */
export async function fetchUserMangaList(
  token: string,
  userId: number,
): Promise<AniListResponse<any>> {
  const query = `
    query ($userId: Int) {
      MediaListCollection(userId: $userId, type: MANGA) {
        lists {
          name
          entries {
            id
            status
            progress
            media {
              id
              title {
                romaji
                english
              }
            }
          }
        }
      }
    }
  `;

  return queryAniList(query, token, { userId });
}

export { queryAniList };
export type { AniListResponse, AniListUser };
