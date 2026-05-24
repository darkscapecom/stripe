import { useAppBridge } from "@saleor/app-sdk/app-bridge";
import ModernError from "modern-errors";
import { useCallback, useEffect, useRef } from "react";
import { type z } from "zod";
import { type JSONValue } from "../types";
import { tryJsonParse } from "./utils";

export const FetchError = ModernError.subclass("FetchError", {
  props: {
    body: "",
    code: 500,
  },
});
export const FetchParseError = ModernError.subclass("FetchParseError");

type FetchConfig<T> = {
  schema: z.ZodType<T>;
  onSuccess?: (data: z.infer<z.ZodType<T>>) => void | Promise<void>;
  onError?: (
    err: InstanceType<typeof FetchError> | InstanceType<typeof FetchParseError>,
  ) => void | Promise<void>;
  onFinished?: () => void | Promise<void>;
};

const CONFIG_API_ENDPOINT = "/api/config";

export const useFetchFn = () => {
  const { appBridgeState } = useAppBridge();
  const { saleorApiUrl, token } = appBridgeState ?? {};

  const requestConfigApi = useCallback(
    (init?: RequestInit | undefined) => {
      // nosemgrep: CONFIG_API_ENDPOINT is a fixed same-origin path, not user-controlled.
      return fetch(CONFIG_API_ENDPOINT, {
        ...init,
        body: JSON.stringify(init?.body),
        headers: {
          ...init?.headers,
          "content-type": "application/json",
          "saleor-api-url": saleorApiUrl ?? "",
          "authorization-bearer": token ?? "",
        },
      });
    },
    [saleorApiUrl, token],
  );

  return {
    requestConfigApi,
    isReady: saleorApiUrl && token,
  };
};

async function handleResponse<T>(res: Response, config: FetchConfig<T> | undefined): Promise<void> {
  if (!res.ok) {
    void config?.onError?.(
      new FetchError(res.statusText, {
        props: {
          body: await res.text(),
          code: res.status,
        },
      }),
    );
    void config?.onFinished?.();
    return;
  }

  if (config) {
    try {
      const json = tryJsonParse(await res.text());
      const data = config.schema.parse(json);
      void config?.onSuccess?.(data);
    } catch (err) {
      void config?.onError?.(FetchParseError.normalize(err));
    }
  }
  void config?.onFinished?.();
}

/** Fetch function, can be replaced to any fetching library, e.g. React Query, useSWR */
export const useFetch = <T>(config?: FetchConfig<T>) => {
  const { requestConfigApi, isReady } = useFetchFn();
  const configRef = useRef(config);

  // We don't want changes in config to trigger re-fetch
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    void (async () => {
      const res = await requestConfigApi();
      await handleResponse(res, configRef.current);
    })();
  }, [requestConfigApi, isReady]);
};

export const usePost = <T>(config?: FetchConfig<T>) => {
  const { requestConfigApi, isReady } = useFetchFn();

  const submit = useCallback(
    async (data: JSONValue) => {
      if (!isReady) {
        return;
      }

      const res = await requestConfigApi({
        method: "POST",
        body: JSON.stringify(data),
      });
      await handleResponse(res, config);
    },
    [config, requestConfigApi, isReady],
  );

  return submit;
};
