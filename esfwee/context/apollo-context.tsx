import React, { ReactNode, useMemo } from "react";
import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { useAuth } from "./auth-context";

export function ApolloClientProvider({ children }: { children: ReactNode }) {
  const { anilistToken } = useAuth();

  const client = useMemo(() => {
    const httpLink = new HttpLink({
      uri: "https://graphql.anilist.co",
    });

    const authLink = new ApolloLink((operation, forward) => {
      operation.setContext({
        headers: {
          authorization: anilistToken ? `Bearer ${anilistToken}` : "",
        },
      });
      return forward(operation);
    });

    return new ApolloClient({
      link: authLink.concat(httpLink),
      cache: new InMemoryCache({
        typePolicies: {
          Query: {
            fields: {
              Page: {
                merge(existing, incoming) {
                  return incoming;
                },
              },
            },
          },
        },
      }),
    });
  }, [anilistToken]);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
