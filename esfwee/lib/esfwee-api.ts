export interface Manga {
  anilist_id: number;
  title: string;
  author?: string;
  description?: string;
  storage_path: string;
  added_at: string;
  updated_at: string;
}

export interface Chapter {
  id: number;
  anilist_id: number;
  chapter_number: number;
  title?: string;
  page_count: number;
  storage_path: string;
  added_at: string;
}

export interface UploadMangaParams {
  anilist_id: number;
  chapter_number: number;
  file: File | { uri: string; name: string; type: string };
}

export class MangaApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any,
  ) {
    super(message);
    this.name = "MangaApiError";
  }
}

export class MangaApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text();
      throw new MangaApiError(
        `API Error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Upload is cbz only atm
  async uploadManga(params: UploadMangaParams): Promise<Manga> {
    const formData = new FormData();
    formData.append("anilist_id", params.anilist_id.toString());
    formData.append("chapter_number", params.chapter_number.toString());

    if ("uri" in params.file) {
      formData.append("file", {
        uri: params.file.uri,
        name: params.file.name,
        type: params.file.type,
      } as any);
    } else {
      // Web
      formData.append("file", params.file);
    }

    const response = await fetch(`${this.baseUrl}/manga`, {
      method: "POST",
      body: formData,
    });

    return this.handleResponse<Manga>(response);
  }

  async listManga(): Promise<Manga[]> {
    const response = await fetch(`${this.baseUrl}/manga`);
    return this.handleResponse<Manga[]>(response);
  }

  async getManga(anilistId: number): Promise<Manga> {
    const response = await fetch(`${this.baseUrl}/manga/${anilistId}`);
    return this.handleResponse<Manga>(response);
  }

  async deleteManga(anilistId: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/manga/${anilistId}`, {
      method: "DELETE",
    });
    return this.handleResponse<void>(response);
  }

  async listChapters(anilistId: number): Promise<Chapter[]> {
    const response = await fetch(`${this.baseUrl}/manga/${anilistId}/chapters`);
    return this.handleResponse<Chapter[]>(response);
  }

  getPageUrl(chapterId: number, pageNum: number): string {
    return `${this.baseUrl}/manga/chapters/${chapterId}/pages/${pageNum}`;
  }

  async getPage(chapterId: number, pageNum: number): Promise<Blob> {
    const response = await fetch(this.getPageUrl(chapterId, pageNum));

    if (!response.ok) {
      throw new MangaApiError(
        `Failed to fetch page: ${response.statusText}`,
        response.status,
      );
    }

    return response.blob();
  }
}
