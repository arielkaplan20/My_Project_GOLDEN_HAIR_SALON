export function saveAuth(token, user) {
  sessionStorage.setItem("token", token);
  sessionStorage.setItem("user", JSON.stringify(user));
}

export function saveUser(user) {
  sessionStorage.setItem("user", JSON.stringify(user));
}

export function getToken() {
  return sessionStorage.getItem("token");
}

export function getUser() {
  const data = sessionStorage.getItem("user");
  return data ? JSON.parse(data) : null;
}

export function logout() {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
  localStorage.removeItem("cart");
}
