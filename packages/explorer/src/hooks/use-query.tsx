import config from "@/config";
import { useCallback, useEffect, useState } from "react";

export interface GQLQueryResponse<Data> {
  data: Data;
}

export default function useQuery<Data>(
  query: string,
  fetchAutomatically = true
) {
  const [data, setData] = useState<Data | undefined>();
  const [loading, setLoading] = useState(fetchAutomatically);
  const fetchQuery = useCallback(async () => {
    setLoading(true);
    const responseData = await fetch(`${config.INDEXER_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
      }),
    });

    try {
      const response = (await responseData.json()) as GQLQueryResponse<Data>;
      console.log("response", response);
      setData(response.data);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
      setData(undefined);
    }
  }, [query]);

  useEffect(() => {
    fetchAutomatically && fetchQuery();
  }, [query, fetchAutomatically]);

  return [data, loading, fetchQuery] as const;
}
