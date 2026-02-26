export const API_BASE = (() => {
  const url = (import.meta.env.VITE_API_URL as string) || "http://127.0.0.1:8000";
  const base = (import.meta.env.VITE_API_BASE as string) || "/api";
  // normalize
  return url.replace(/\/$/, "") + base;
})();

async function handleResponse(res: Response) {
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text;
  }
  if (!res.ok) {
    const err = (data && data.detail) || data || res.statusText;
    throw new Error(err);
  }
  return data;
}

export async function postJSON(path: string, body: any, token?: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function postForm(path: string, form: FormData, token?: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });
  return handleResponse(res);
}

export async function getJSON(path: string, token?: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return handleResponse(res);
}

export default { API_BASE, postJSON, getJSON };
