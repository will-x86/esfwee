import { gql, TypedDocumentNode } from "@apollo/client";
import type {
  SearchMangaQuery,
  SearchMangaQueryVariables,
  GetMangaDetailsQuery,
  GetMangaDetailsQueryVariables,
  GetPopularMangaQuery,
  GetPopularMangaQueryVariables,
} from "@/__generated__/graphql";

export const SEARCH_MANGA: TypedDocumentNode<
  SearchMangaQuery,
  SearchMangaQueryVariables
> = gql`
  query SearchManga($search: String!, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        hasNextPage
        currentPage
        lastPage
      }
      media(search: $search, type: MANGA, sort: POPULARITY_DESC) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          large
          medium
        }
        chapters
        volumes
        format
        status
        averageScore
      }
    }
  }
`;

export const GET_MANGA_DETAILS: TypedDocumentNode<
  GetMangaDetailsQuery,
  GetMangaDetailsQueryVariables
> = gql`
  query GetMangaDetails($id: Int!) {
    Media(id: $id, type: MANGA) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        large
        medium
      }
      chapters
      volumes
      format
      status
      description
      averageScore
    }
  }
`;

export const GET_POPULAR_MANGA: TypedDocumentNode<
  GetPopularMangaQuery,
  GetPopularMangaQueryVariables
> = gql`
  query GetPopularManga($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        hasNextPage
        currentPage
        lastPage
      }
      media(type: MANGA, sort: POPULARITY_DESC) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          large
          medium
        }
        chapters
        volumes
        format
        status
        averageScore
      }
    }
  }
`;
